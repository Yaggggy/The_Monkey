import base64
from io import BytesIO
import json
import time

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from fastapi.responses import StreamingResponse
from PIL import Image
import requests
from sqlalchemy.orm import Session
import numpy as np

try:
	import cv2
except Exception:  # pragma: no cover - optional dependency
	cv2 = None

from app.api.deps import get_current_user, get_db_session
from app.schemas.event import (
	EventCreate,
	EventRead,
	InferenceResponse,
	InferenceStreamRequest,
)
from app.services.camera_service import CameraService
from app.services.event_service import EventService
from app.services.inference_service import get_inference_service

router = APIRouter(dependencies=[Depends(get_current_user)])
service = EventService()
camera_service = CameraService()


def _fetch_snapshot(stream_url: str) -> Image.Image:
	url = stream_url.strip()
	if url.lower().startswith(("http://", "https://")):
		base_urls = [url]
	else:
		base_urls = [f"http://{url}", f"https://{url}"]

	candidates: list[str] = []
	for base_url in base_urls:
		base = base_url.rstrip("/")
		candidates.extend(
			[
				base,
				f"{base}/shot.jpg",
				f"{base}/photo.jpg",
				f"{base}/snapshot.jpg",
				f"{base}/frame.jpg",
				f"{base}/live.jpg",
			]
		)

	last_error: Exception | None = None
	for candidate in candidates:
		try:
			response = requests.get(candidate, timeout=10, stream=True)
			response.raise_for_status()
			content_type = response.headers.get("content-type", "").lower()
			if content_type.startswith("image/"):
				return Image.open(BytesIO(response.content)).convert("RGB")
			if "multipart/x-mixed-replace" in content_type:
				return _extract_frame_from_mjpeg(response)
		except Exception as exc:
			last_error = exc
			continue

	if cv2 is None:
		raise HTTPException(
			status_code=400,
			detail="OpenCV not installed. Install opencv-python to read video streams.",
		)

	for base_url in base_urls:
		frame = _fetch_frame_with_opencv(base_url)
		if frame is not None:
			return frame

	raise HTTPException(status_code=400, detail=f"Failed to fetch snapshot: {last_error}")


def _extract_frame_from_mjpeg(response) -> Image.Image:
	frame_start = b"\xff\xd8\xff"
	frame_end = b"\xff\xd9"
	buffer = b""

	try:
		for chunk in response.iter_content(chunk_size=8192):
			buffer += chunk
			start_idx = buffer.find(frame_start)
			if start_idx != -1:
				end_idx = buffer.find(frame_end, start_idx)
				if end_idx != -1:
					jpeg_data = buffer[start_idx : end_idx + 2]
					return Image.open(BytesIO(jpeg_data)).convert("RGB")
	except Exception as exc:
		raise HTTPException(status_code=400, detail=f"Failed to extract MJPEG frame: {exc}")

	raise HTTPException(status_code=400, detail="No valid JPEG frame found in MJPEG stream")


def _fetch_frame_with_opencv(stream_url: str) -> Image.Image | None:
	if cv2 is None:
		return None
	cap = cv2.VideoCapture(stream_url, cv2.CAP_FFMPEG)
	if not cap.isOpened():
		cap.release()
		return None
	try:
		ok, frame = cap.read()
		if not ok or frame is None:
			return None
		frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
		return Image.fromarray(frame_rgb)
	finally:
		cap.release()


@router.get("/", response_model=list[EventRead])
def list_events(
	db: Session = Depends(get_db_session),
	skip: int = 0,
	limit: int = 100,
	camera_id: int | None = None,
):
	if camera_id is not None:
		return service.list_events_by_camera(db, camera_id, skip=skip, limit=limit)
	return service.list_events(db, skip=skip, limit=limit)


@router.post("/", response_model=EventRead, status_code=status.HTTP_201_CREATED)
def create_event(payload: EventCreate, db: Session = Depends(get_db_session)):
	return service.create_event(db, payload)


@router.post("/infer", response_model=InferenceResponse)
async def infer_from_image(
	camera_id: int | None = None,
	image: UploadFile = File(...),
	db: Session = Depends(get_db_session),
):
	if image.content_type not in {"image/jpeg", "image/png", "image/webp"}:
		raise HTTPException(status_code=400, detail="Unsupported image type")

	data = await image.read()
	try:
		pil_image = Image.open(BytesIO(data)).convert("RGB")
	except OSError as exc:
		raise HTTPException(status_code=400, detail="Invalid image data") from exc

	inference = get_inference_service()
	detections = inference.predict(pil_image)
	if detections:
		service.create_events_from_detections(
			db,
			camera_id=camera_id,
			user_id=None,
			detections=detections,
		)

	return InferenceResponse(detections=detections)


@router.post("/infer-stream", response_model=InferenceResponse)
def infer_from_stream(
	payload: InferenceStreamRequest,
	db: Session = Depends(get_db_session),
):
	stream_url = payload.stream_url
	camera_id = payload.camera_id

	if camera_id is not None:
		camera = camera_service.get_camera(db, camera_id)
		if not camera or not camera.stream_url:
			raise HTTPException(status_code=404, detail="Camera stream not found")
		stream_url = camera.stream_url

	if not stream_url:
		raise HTTPException(status_code=400, detail="stream_url or camera_id is required")

	pil_image = _fetch_snapshot(stream_url)
	inference = get_inference_service()
	detections = inference.predict(pil_image)

	if detections:
		service.create_events_from_detections(
			db,
			camera_id=camera_id,
			user_id=None,
			detections=detections,
		)

	return InferenceResponse(detections=detections)


@router.get("/live-stream")
def start_live_stream(
	stream_url: str | None = None,
	camera_id: int | None = None,
	db: Session = Depends(get_db_session),
):
	if camera_id is not None:
		camera = camera_service.get_camera(db, camera_id)
		if not camera or not camera.stream_url:
			raise HTTPException(status_code=404, detail="Camera stream not found")
		stream_url = camera.stream_url

	if not stream_url:
		raise HTTPException(status_code=400, detail="stream_url or camera_id is required")

	def generate_frames():
		if cv2 is None:
			yield f"data: {{\"error\": \"OpenCV not installed\"}}\n\n"
			return

		cap = cv2.VideoCapture(stream_url, cv2.CAP_FFMPEG)
		if not cap.isOpened():
			yield f"data: {{\"error\": \"Failed to open stream\"}}\n\n"
			return

		inference = get_inference_service()
		frame_count = 0

		try:
			while True:
				ok, frame = cap.read()
				if not ok or frame is None:
					time.sleep(0.1)
					continue

				frame_count += 1
				if frame_count % 3 != 0:
					continue

				frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
				pil_image = Image.fromarray(frame_rgb)

				detections = inference.predict(pil_image)

				if detections:
					for detection in detections:
						x1, y1, x2, y2 = map(int, detection["bbox"])
						label = detection["label"]
						conf = detection["confidence"]

						cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 0, 255), 2)
						cv2.putText(
							frame,
							f"{label} {conf:.2f}",
							(x1, y1 - 10),
							cv2.FONT_HERSHEY_SIMPLEX,
							0.6,
							(0, 0, 255),
							2,
						)

					service.create_events_from_detections(
						db, camera_id=camera_id, user_id=None, detections=detections
					)

				_, buffer = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 80])
				frame_base64 = base64.b64encode(buffer).decode("utf-8")

				detection_data = [
					{"label": d["label"], "confidence": d["confidence"]} for d in detections
				]

				yield f"data: {{\"frame\": \"{frame_base64}\", \"detections\": {json.dumps(detection_data)}}}\n\n"

				time.sleep(0.033)
		except GeneratorExit:
			pass
		finally:
			cap.release()

	return StreamingResponse(generate_frames(), media_type="text/event-stream")
