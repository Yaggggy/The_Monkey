import json
import logging
from dataclasses import dataclass
from functools import lru_cache
from typing import Any, Dict
from urllib.request import urlopen

from jose import jwt
from jose.exceptions import JWTError

from app.core.config import get_settings

logger = logging.getLogger(__name__)


@dataclass
class UserContext:
	user_id: str
	email: str | None = None


def _cognito_jwks_url() -> str:
	settings = get_settings()
	return (
		f"https://cognito-idp.{settings.COGNITO_REGION}.amazonaws.com/"
		f"{settings.COGNITO_USER_POOL_ID}/.well-known/jwks.json"
	)


@lru_cache
def _get_jwks() -> Dict[str, Any]:
	url = _cognito_jwks_url()
	with urlopen(url) as response:
		return json.loads(response.read().decode("utf-8"))


def _verify_cognito_jwt(token: str) -> UserContext:
	settings = get_settings()
	jwks = _get_jwks()

	header = jwt.get_unverified_header(token)
	kid = header.get("kid")
	key = next((k for k in jwks.get("keys", []) if k.get("kid") == kid), None)
	if not key:
		raise JWTError("Invalid token header")

	claims = jwt.decode(
		token,
		key,
		algorithms=["RS256"],
		audience=settings.COGNITO_APP_CLIENT_ID or None,
		options={"verify_aud": bool(settings.COGNITO_APP_CLIENT_ID)},
	)

	return UserContext(
		user_id=claims.get("sub", ""),
		email=claims.get("email"),
	)


def get_user_from_token(token: str) -> UserContext:
	settings = get_settings()
	if settings.AUTH_MODE.lower() == "cognito":
		return _verify_cognito_jwt(token)

	# Stub mode for local MVP.
	return UserContext(user_id="local-user", email="local@example.com")
