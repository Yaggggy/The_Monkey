from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.api import api_router
from app.core.config import get_settings
from app.core.logging import configure_logging
from app.db.base import Base
from app.db.session import engine
from app.services.inference_service import get_inference_service
from app.models import camera, event, user  # noqa: F401


def create_app() -> FastAPI:
	settings = get_settings()
	configure_logging()

	app = FastAPI(title=settings.PROJECT_NAME)
	app.add_middleware(
		CORSMiddleware,
		allow_origins=settings.CORS_ORIGINS,
		allow_credentials=True,
		allow_methods=["*"],
		allow_headers=["*"],
	)

	app.include_router(api_router, prefix=settings.API_V1_STR)

	@app.on_event("startup")
	def on_startup() -> None:
		Base.metadata.create_all(bind=engine)

	@app.get("/health")
	def health_check():
		return {"status": "ok"}

	return app


app = create_app()
