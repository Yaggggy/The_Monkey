from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.security import UserContext, get_user_from_token
from app.db.session import get_db

bearer_scheme = HTTPBearer(auto_error=False)


def get_current_user(
	credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> UserContext:
	settings = get_settings()
	if settings.AUTH_MODE.lower() == "stub":
		return get_user_from_token("stub")

	if credentials is None or not credentials.credentials:
		raise HTTPException(
			status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing credentials"
		)
	return get_user_from_token(credentials.credentials)


def get_db_session(db: Session = Depends(get_db)) -> Session:
	return db
