from io import BytesIO

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from PIL import Image
import requests
from sqlalchemy.orm import Session

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
	url = stream_url.rstrip("/")
	candidates = [url]
	if not url.lower().endswith((".jpg", ".jpeg", ".png")):
		candidates.append(f"{url}/shot.jpg")
		candidates.append(f"{url}/photo.jpg")

	last_error: Exception | None = None
	for candidate in candidates:
		try:
			response = requests.get(candidate, timeout=10)
			response.raise_for_status()
			return Image.open(BytesIO(response.content)).convert("RGB")
		except Exception as exc:
			last_error = exc
			continue

	raise HTTPException(status_code=400, detail=f"Failed to fetch snapshot: {last_error}")


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
