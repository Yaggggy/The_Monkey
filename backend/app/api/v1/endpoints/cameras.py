from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db_session
from app.schemas.camera import CameraCreate, CameraRead, CameraUpdate
from app.services.camera_service import CameraService

router = APIRouter(dependencies=[Depends(get_current_user)])
service = CameraService()


@router.get("/", response_model=list[CameraRead])
def list_cameras(
	db: Session = Depends(get_db_session),
	skip: int = 0,
	limit: int = 100,
):
	return service.list_cameras(db, skip=skip, limit=limit)


@router.post("/", response_model=CameraRead, status_code=status.HTTP_201_CREATED)
def create_camera(payload: CameraCreate, db: Session = Depends(get_db_session)):
	return service.create_camera(db, payload)


@router.get("/{camera_id}", response_model=CameraRead)
def get_camera(camera_id: int, db: Session = Depends(get_db_session)):
	camera = service.get_camera(db, camera_id)
	if not camera:
		raise HTTPException(status_code=404, detail="Camera not found")
	return camera


@router.put("/{camera_id}", response_model=CameraRead)
def update_camera(
	camera_id: int,
	payload: CameraUpdate,
	db: Session = Depends(get_db_session),
):
	camera = service.get_camera(db, camera_id)
	if not camera:
		raise HTTPException(status_code=404, detail="Camera not found")
	return service.update_camera(db, camera, payload)


@router.delete("/{camera_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_camera(camera_id: int, db: Session = Depends(get_db_session)):
	camera = service.get_camera(db, camera_id)
	if not camera:
		raise HTTPException(status_code=404, detail="Camera not found")
	service.delete_camera(db, camera)
	return None
