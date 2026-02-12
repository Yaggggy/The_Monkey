from typing import List

from sqlalchemy.orm import Session

from app.models.camera import Camera


class CameraRepository:
	def get(self, db: Session, camera_id: int) -> Camera | None:
		return db.query(Camera).filter(Camera.id == camera_id).first()

	def list_all(self, db: Session, skip: int = 0, limit: int = 100) -> List[Camera]:
		return db.query(Camera).offset(skip).limit(limit).all()

	def create(self, db: Session, camera: Camera) -> Camera:
		db.add(camera)
		db.commit()
		db.refresh(camera)
		return camera

	def update(self, db: Session, camera: Camera) -> Camera:
		db.commit()
		db.refresh(camera)
		return camera

	def delete(self, db: Session, camera: Camera) -> None:
		db.delete(camera)
		db.commit()
