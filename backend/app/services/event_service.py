from datetime import datetime, timezone
from typing import Any, Dict, List

from sqlalchemy.orm import Session

from app.models.event import Event
from app.repositories.event_repo import EventRepository
from app.schemas.event import EventCreate


class EventService:
	def __init__(self) -> None:
		self.repo = EventRepository()

	def list_events(self, db: Session, skip: int = 0, limit: int = 100) -> List[Event]:
		return self.repo.list_all(db, skip=skip, limit=limit)

	def list_events_by_camera(
		self, db: Session, camera_id: int, skip: int = 0, limit: int = 100
	) -> List[Event]:
		return self.repo.list_by_camera(db, camera_id, skip=skip, limit=limit)

	def create_event(self, db: Session, payload: EventCreate) -> Event:
		event = Event(
			camera_id=payload.camera_id,
			user_id=payload.user_id,
			label=payload.label,
			confidence=payload.confidence,
			image_path=payload.image_path,
			payload=payload.payload,
		)
		return self.repo.create(db, event)

	def create_events_from_detections(
		self,
		db: Session,
		camera_id: int | None,
		user_id: int | None,
		detections: List[Dict[str, Any]],
	) -> List[Event]:
		events = [
			Event(
				camera_id=camera_id,
				user_id=user_id,
				label=det["label"],
				confidence=float(det["confidence"]),
				payload={"bbox": det["bbox"]},
			)
			for det in detections
		]
		return self.repo.create_many(db, events)
