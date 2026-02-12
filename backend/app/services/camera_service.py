from typing import List

from sqlalchemy.orm import Session

from app.models.camera import Camera
from app.repositories.camera_repo import CameraRepository
from app.schemas.camera import CameraCreate, CameraUpdate


class CameraService:
	def __init__(self) -> None:
		self.repo = CameraRepository()

	def list_cameras(self, db: Session, skip: int = 0, limit: int = 100) -> List[Camera]:
		return self.repo.list_all(db, skip=skip, limit=limit)

	def get_camera(self, db: Session, camera_id: int) -> Camera | None:
		return self.repo.get(db, camera_id)

	def create_camera(self, db: Session, payload: CameraCreate) -> Camera:
		camera = Camera(
			name=payload.name,
			stream_url=payload.stream_url,
			location=payload.location,
			is_active=payload.is_active,
		)
		return self.repo.create(db, camera)

	def update_camera(
		self, db: Session, camera: Camera, payload: CameraUpdate
	) -> Camera:
		for field, value in payload.model_dump(exclude_unset=True).items():
			setattr(camera, field, value)
		return self.repo.update(db, camera)

	def delete_camera(self, db: Session, camera: Camera) -> None:
		self.repo.delete(db, camera)
