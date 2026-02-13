from functools import lru_cache
from pathlib import Path
from typing import List

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


BASE_DIR = Path(__file__).resolve().parents[2]


def _default_sqlite_url() -> str:
	db_path = BASE_DIR / "app.db"
	return f"sqlite:///{db_path.as_posix()}"


class Settings(BaseSettings):
	model_config = SettingsConfigDict(
		env_file=str(BASE_DIR / ".env"),
		env_file_encoding="utf-8",
		extra="ignore",
	)

	PROJECT_NAME: str = "The Monkey API"
	API_V1_STR: str = "/api/v1"
	LOG_LEVEL: str = "INFO"

	DATABASE_URL: str = _default_sqlite_url()

	MODEL_PATH: str = str(BASE_DIR / "best.pt")
	DETECTION_LABELS: List[str] = Field(
		default_factory=lambda: [
			"person",
			"car",
			"fire",
			"weapon",
			"accident",
			"fight",
			"fighting",
		]
	)

	AUTH_MODE: str = "stub"
	COGNITO_REGION: str = ""
	COGNITO_USER_POOL_ID: str = ""
	COGNITO_APP_CLIENT_ID: str = ""

	AWS_REGION: str = ""
	S3_BUCKET: str = ""
	SNS_TOPIC_ARN: str = ""
	REDIS_URL: str = ""

	CORS_ORIGINS: List[str] = Field(
		default_factory=lambda: [
			"http://localhost:3000",
			"http://127.0.0.1:3000",
			"http://localhost:5173",
			"http://127.0.0.1:5173",
		]
	)


@lru_cache
def get_settings() -> Settings:
	return Settings()
