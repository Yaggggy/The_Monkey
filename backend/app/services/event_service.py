from datetime import datetime, timezone
from typing import Any, Dict, List

from sqlalchemy.orm import Session

from app.models.camera import Camera
from app.models.event import Event
from app.repositories.camera_repo import CameraRepository
from app.repositories.event_repo import EventRepository
from app.schemas.event import EventCreate
from app.services.notification_service import EmailNotificationService


class EventService:
	def __init__(self) -> None:
		self.repo = EventRepository()
		self.camera_repo = CameraRepository()
		self.notification_service = EmailNotificationService()

	def list_events(self, db: Session, skip: int = 0, limit: int = 100) -> List[Event]:
		return self.repo.list_all(db, skip=skip, limit=limit)

	def list_events_by_camera(
		self, db: Session, camera_id: int, skip: int = 0, limit: int = 100
	) -> List[Event]:
		return self.repo.list_by_camera(db, camera_id, skip=skip, limit=limit)

	def create_event(self, db: Session, payload: EventCreate) -> Event:
		now = datetime.now()
		event = Event(
			camera_id=payload.camera_id,
			user_id=payload.user_id,
			label=payload.label,
			confidence=payload.confidence,
			image_path=payload.image_path,
			payload=payload.payload,
			occurred_at=now,
		)
		created_event = self.repo.create(db, event)
		self._send_notification(
			db,
			events=[created_event],
			detections=[
				{
					"label": created_event.label,
					"confidence": created_event.confidence,
					"bbox": (created_event.payload or {}).get("bbox") if created_event.payload else None,
				}
			],
		)
		return created_event

	def create_events_from_detections(
		self,
		db: Session,
		camera_id: int | None,
		user_id: int | None,
		detections: List[Dict[str, Any]],
		image_path: str | None = None,
	) -> List[Event]:
		now = datetime.now()
		events = [
			Event(
				camera_id=camera_id,
				user_id=user_id,
				label=det["label"],
				confidence=float(det["confidence"]),
				image_path=image_path,
				payload={"bbox": det["bbox"]},
				occurred_at=now,
			)
			for det in detections
		]
		created_events = self.repo.create_many(db, events)
		self._send_notification(db, events=created_events, detections=detections)
		return created_events

	def _send_notification(
		self,
		db: Session,
		events: List[Event],
		detections: List[Dict[str, Any]],
	) -> None:
		camera = self._get_camera(db, events[0].camera_id if events else None)
		self.notification_service.send_detection_alert(
			events=events,
			detections=detections,
			camera=camera,
		)

	def _get_camera(self, db: Session, camera_id: int | None) -> Camera | None:
		if camera_id is None:
			return None
		return self.camera_repo.get(db, camera_id)
