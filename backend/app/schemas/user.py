from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr


class UserBase(BaseModel):
	email: EmailStr
	full_name: str | None = None
	is_active: bool = True


class UserCreate(UserBase):
	pass


class UserRead(UserBase):
	id: int
	created_at: datetime | None = None

	model_config = ConfigDict(from_attributes=True)
