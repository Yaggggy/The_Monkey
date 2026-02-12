from fastapi import APIRouter

from app.api.v1.endpoints import cameras, events, users

api_router = APIRouter()

api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(cameras.router, prefix="/cameras", tags=["cameras"])
api_router.include_router(events.router, prefix="/events", tags=["events"])
