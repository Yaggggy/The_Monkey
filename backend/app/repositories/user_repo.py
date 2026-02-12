from typing import List

from sqlalchemy.orm import Session

from app.models.user import User


class UserRepository:
	def get(self, db: Session, user_id: int) -> User | None:
		return db.query(User).filter(User.id == user_id).first()

	def get_by_email(self, db: Session, email: str) -> User | None:
		return db.query(User).filter(User.email == email).first()

	def list_all(self, db: Session, skip: int = 0, limit: int = 100) -> List[User]:
		return db.query(User).offset(skip).limit(limit).all()

	def create(self, db: Session, user: User) -> User:
		db.add(user)
		db.commit()
		db.refresh(user)
		return user
