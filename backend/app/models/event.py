from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, JSON, String, func

from app.db.base import Base


class Event(Base):
	__tablename__ = "events"

	id = Column(Integer, primary_key=True, index=True)
	camera_id = Column(Integer, ForeignKey("cameras.id"), nullable=True)
	user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
	label = Column(String, nullable=False)
	confidence = Column(Float, nullable=False)
	image_path = Column(String, nullable=True)
	payload = Column(JSON, nullable=True)
	occurred_at = Column(DateTime(timezone=True), server_default=func.now())
	created_at = Column(DateTime(timezone=True), server_default=func.now())
