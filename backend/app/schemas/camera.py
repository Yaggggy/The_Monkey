from datetime import datetime

from pydantic import BaseModel, ConfigDict


class CameraBase(BaseModel):
	name: str
	stream_url: str | None = None
	location: str | None = None
	is_active: bool = True


class CameraCreate(CameraBase):
	pass


class CameraUpdate(BaseModel):
	name: str | None = None
	stream_url: str | None = None
	location: str | None = None
	is_active: bool | None = None


class CameraRead(CameraBase):
	id: int
	created_at: datetime | None = None

	model_config = ConfigDict(from_attributes=True)
