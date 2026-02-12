from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db_session
from app.schemas.user import UserCreate, UserRead
from app.services.user_service import UserService

router = APIRouter(dependencies=[Depends(get_current_user)])
service = UserService()


@router.get("/", response_model=list[UserRead])
def list_users(
	db: Session = Depends(get_db_session),
	skip: int = 0,
	limit: int = 100,
):
	return service.list_users(db, skip=skip, limit=limit)


@router.post("/", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def create_user(payload: UserCreate, db: Session = Depends(get_db_session)):
	return service.create_user(db, payload)


@router.get("/{user_id}", response_model=UserRead)
def get_user(user_id: int, db: Session = Depends(get_db_session)):
	user = service.get_user(db, user_id)
	if not user:
		raise HTTPException(status_code=404, detail="User not found")
	return user
