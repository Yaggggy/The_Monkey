from datetime import datetime
from typing import Any, Dict, List

from pydantic import BaseModel, ConfigDict


class EventBase(BaseModel):
	camera_id: int | None = None
	user_id: int | None = None
	label: str
	confidence: float
	image_path: str | None = None
	payload: Dict[str, Any] | None = None


class EventCreate(EventBase):
	pass


class EventRead(EventBase):
	id: int
	occurred_at: datetime | None = None

	model_config = ConfigDict(from_attributes=True)


class Detection(BaseModel):
	label: str
	confidence: float
	bbox: List[float]


class InferenceResponse(BaseModel):
	detections: List[Detection]


class InferenceStreamRequest(BaseModel):
	camera_id: int | None = None
	stream_url: str | None = None
