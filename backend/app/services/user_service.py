from typing import List

from sqlalchemy.orm import Session

from app.models.user import User
from app.repositories.user_repo import UserRepository
from app.schemas.user import UserCreate


class UserService:
    def __init__(self) -> None:
        self.repo = UserRepository()

    def list_users(self, db: Session, skip: int = 0, limit: int = 100) -> List[User]:
        return self.repo.list_all(db, skip=skip, limit=limit)

    def get_user(self, db: Session, user_id: int) -> User | None:
        return self.repo.get(db, user_id)

    def create_user(self, db: Session, payload: UserCreate) -> User:
        user = User(
            email=payload.email,
            full_name=payload.full_name,
            is_active=payload.is_active,
        )
        return self.repo.create(db, user)

    def delete_user(self, db: Session, user: User) -> None:
        self.repo.delete(db, user)
