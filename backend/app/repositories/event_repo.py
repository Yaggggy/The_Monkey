from typing import List

from sqlalchemy.orm import Session

from app.models.event import Event


class EventRepository:
	def get(self, db: Session, event_id: int) -> Event | None:
		return db.query(Event).filter(Event.id == event_id).first()

	def list_all(self, db: Session, skip: int = 0, limit: int = 100) -> List[Event]:
		return db.query(Event).offset(skip).limit(limit).all()

	def list_by_camera(
		self, db: Session, camera_id: int, skip: int = 0, limit: int = 100
	) -> List[Event]:
		return (
			db.query(Event)
			.filter(Event.camera_id == camera_id)
			.offset(skip)
			.limit(limit)
			.all()
		)

	def create(self, db: Session, event: Event) -> Event:
		db.add(event)
		db.commit()
		db.refresh(event)
		return event

	def create_many(self, db: Session, events: List[Event]) -> List[Event]:
		db.add_all(events)
		db.commit()
		for event in events:
			db.refresh(event)
		return events
