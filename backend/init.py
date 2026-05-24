#!/usr/bin/env python
"""
Initialization script for the Monkey video inference system.
Runs setup and initialization tasks before starting the API server.
"""

import os
import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent))

from app.db.session import SessionLocal, engine
from app.db.base import Base
from app.models.camera import Camera
from app.core.config import get_settings


def init_database():
	"""Initialize database and create tables."""
	print("Initializing database...")
	try:
		Base.metadata.create_all(bind=engine)
		print("Database initialized successfully")
		return True
	except Exception as e:
		print(f"Database initialization failed: {e}")
		return False


def setup_default_camera():
	"""Set up default camera from environment or predefined URL."""
	db = SessionLocal()
	try:
		# Check if any cameras exist
		existing_cameras = db.query(Camera).first()
		if existing_cameras:
			print("Cameras already configured, skipping default camera setup")
			return True

		# Try to get from environment variable
		stream_url = os.getenv("DEFAULT_STREAM_URL", "http://192.168.29.7:8080")
		camera_name = os.getenv("DEFAULT_CAMERA_NAME", "Default Camera")
		camera_location = os.getenv("DEFAULT_CAMERA_LOCATION", "Main Location")

		# Create default camera
		camera = Camera(
			name=camera_name,
			stream_url=stream_url,
			location=camera_location,
			is_active=True
		)
		db.add(camera)
		db.commit()
		db.refresh(camera)

		print(f" Default camera created:")
		print(f"  - ID: {camera.id}")
		print(f"  - Name: {camera.name}")
		print(f"  - Stream URL: {camera.stream_url}")
		print(f"  - Location: {camera.location}")
		return True

	except Exception as e:
		db.rollback()
		print(f" Failed to set up default camera: {e}")
		return False
	finally:
		db.close()


def verify_configuration():
	"""Verify that all required configuration is set."""
	print("\n Verifying configuration...")
	settings = get_settings()

	checks = [
		("Model Path", settings.MODEL_PATH and Path(settings.MODEL_PATH).exists()),
		("Detection Labels", bool(settings.DETECTION_LABELS)),
		("Database URL", bool(settings.DATABASE_URL)),
		("Auth Mode", settings.AUTH_MODE.lower() in ["stub", "cognito"]),
	]

	all_passed = True
	for check_name, result in checks:
		if result:
			print(f"  {check_name}: OK")
		else:
			print(f"   {check_name}: FAILED")
			all_passed = False

	# Check optional features
	print("\n  Optional Features:")
	email_enabled = settings.EMAIL_NOTIFICATIONS_ENABLED and settings.ALERT_EMAIL_TO
	if email_enabled:
		print(f"  Email Notifications: ENABLED ({settings.ALERT_EMAIL_TO})")
	else:
		print(f"  ℹ Email Notifications: DISABLED")

	return all_passed


def print_startup_info():
	"""Print startup information and usage instructions."""
	print("\n" + "=" * 60)
	print(" THE MONKEY VIDEO INFERENCE SYSTEM")
	print("=" * 60)
	print("\n System Configuration:")
	print("  - API Endpoint: http://localhost:8000")
	print("  - API Documentation: http://localhost:8000/docs")
	print("  - Health Check: http://localhost:8000/health")
	print("\n Available API Endpoints:")
	print("  - GET  /api/v1/cameras - List all cameras")
	print("  - POST /api/v1/cameras - Add new camera")
	print("  - GET  /api/v1/events - Get detection events")
	print("  - GET  /api/v1/events/live-stream - Stream with live inference")
	print("  - GET  /api/v1/events/test-stream - Test stream connectivity")
	print("  - POST /api/v1/events/infer-stream - Run inference on snapshot")
	print("\n Quick Start Commands:")
	print("  1. Test stream connectivity:")
	print("     curl 'http://localhost:8000/api/v1/events/test-stream?stream_url=http://192.168.29.7:8080'")
	print("\n  2. Get cameras:")
	print("     curl 'http://localhost:8000/api/v1/cameras'")
	print("\n  3. Start live inference:")
	print("     curl 'http://localhost:8000/api/v1/events/live-stream?camera_id=1'")
	print("\n  4. Run inference on snapshot:")
	print("     curl -X POST 'http://localhost:8000/api/v1/events/infer-stream' \\")
	print("          -H 'Content-Type: application/json' \\")
	print("          -d '{\"camera_id\": 1}'")
	print("\n" + "=" * 60 + "\n")


def main():
	"""Run all initialization tasks."""
	print("\n Starting initialization sequence...\n")

	# Step 1: Initialize database
	if not init_database():
		print(" Failed to initialize database. Exiting.")
		return False

	# Step 2: Setup default camera
	print()
	if not setup_default_camera():
		print("  Warning: Failed to set up default camera")

	# Step 3: Verify configuration
	print()
	if not verify_configuration():
		print("  Warning: Some configuration checks failed")

	# Step 4: Print startup info
	print_startup_info()
	return True


if __name__ == "__main__":
	success = main()
	sys.exit(0 if success else 1)
