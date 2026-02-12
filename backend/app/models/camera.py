from sqlalchemy import Boolean, Column, DateTime, Integer, String, func

from app.db.base import Base


class Camera(Base):
	__tablename__ = "cameras"

	id = Column(Integer, primary_key=True, index=True)
	name = Column(String, nullable=False)
	stream_url = Column(String, nullable=True)
	location = Column(String, nullable=True)
	is_active = Column(Boolean, default=True)
	created_at = Column(DateTime(timezone=True), server_default=func.now())
	updated_at = Column(DateTime(timezone=True), onupdate=func.now())
