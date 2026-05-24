#!/usr/bin/env python
"""
Camera management script for initializing and managing video streams.
Usage:
    python manage_cameras.py init-stream --name "Camera Name" --url "http://192.168.29.7:8080" --location "Location"
    python manage_cameras.py list
    python manage_cameras.py test-stream --url "http://192.168.29.7:8080"
"""

import argparse
import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent))

from app.db.session import SessionLocal, engine
from app.db.base import Base
from app.models.camera import Camera
from app.api.v1.endpoints.events import _fetch_snapshot


def init_db():
	"""Initialize database tables."""
	Base.metadata.create_all(bind=engine)
	print("✓ Database initialized")


def create_camera(name: str, stream_url: str, location: str | None = None):
	"""Create a new camera stream."""
	db = SessionLocal()
	try:
		# Check if camera already exists
		existing = db.query(Camera).filter(Camera.stream_url == stream_url).first()
		if existing:
			print(f"✗ Camera with URL '{stream_url}' already exists (ID: {existing.id})")
			return False

		camera = Camera(
			name=name,
			stream_url=stream_url,
			location=location or "Unknown",
			is_active=True
		)
		db.add(camera)
		db.commit()
		db.refresh(camera)
		print(f"✓ Camera created successfully")
		print(f"  - ID: {camera.id}")
		print(f"  - Name: {camera.name}")
		print(f"  - URL: {camera.stream_url}")
		print(f"  - Location: {camera.location}")
		return True
	except Exception as e:
		db.rollback()
		print(f"✗ Error creating camera: {e}")
		return False
	finally:
		db.close()


def list_cameras():
	"""List all cameras."""
	db = SessionLocal()
	try:
		cameras = db.query(Camera).all()
		if not cameras:
			print("No cameras found")
			return

		print(f"\nFound {len(cameras)} camera(s):\n")
		for cam in cameras:
			status = "✓ Active" if cam.is_active else "✗ Inactive"
			print(f"[{cam.id}] {cam.name} - {status}")
			print(f"    URL: {cam.stream_url}")
			print(f"    Location: {cam.location}")
			print(f"    Created: {cam.created_at}")
			print()
	except Exception as e:
		print(f"✗ Error listing cameras: {e}")
	finally:
		db.close()


def test_stream(stream_url: str):
	"""Test if a stream URL is accessible."""
	try:
		print(f"Testing stream: {stream_url}")
		image = _fetch_snapshot(stream_url)
		print(f"✓ Stream test successful!")
		print(f"  - Image size: {image.size}")
		print(f"  - Image format: {image.format}")
		return True
	except Exception as e:
		print(f"✗ Stream test failed: {e}")
		return False


def delete_camera(camera_id: int):
	"""Delete a camera."""
	db = SessionLocal()
	try:
		camera = db.query(Camera).filter(Camera.id == camera_id).first()
		if not camera:
			print(f"✗ Camera with ID {camera_id} not found")
			return False

		db.delete(camera)
		db.commit()
		print(f"✓ Camera {camera_id} deleted")
		return True
	except Exception as e:
		db.rollback()
		print(f"✗ Error deleting camera: {e}")
		return False
	finally:
		db.close()


def main():
	parser = argparse.ArgumentParser(description="Manage camera streams")
	subparsers = parser.add_subparsers(dest="command")

	# Init database
	subparsers.add_parser("init-db", help="Initialize database")

	# Create camera
	create_parser = subparsers.add_parser("init-stream", help="Create a new camera stream")
	create_parser.add_argument("--name", required=True, help="Camera name")
	create_parser.add_argument("--url", required=True, help="Stream URL")
	create_parser.add_argument("--location", help="Camera location")

	# List cameras
	subparsers.add_parser("list", help="List all cameras")

	# Test stream
	test_parser = subparsers.add_parser("test-stream", help="Test a stream URL")
	test_parser.add_argument("--url", required=True, help="Stream URL to test")

	# Delete camera
	delete_parser = subparsers.add_parser("delete", help="Delete a camera")
	delete_parser.add_argument("--id", type=int, required=True, help="Camera ID")

	args = parser.parse_args()

	if not args.command:
		parser.print_help()
		return

	if args.command == "init-db":
		init_db()
	elif args.command == "init-stream":
		init_db()
		create_camera(args.name, args.url, args.location)
	elif args.command == "list":
		list_cameras()
	elif args.command == "test-stream":
		test_stream(args.url)
	elif args.command == "delete":
		delete_camera(args.id)


if __name__ == "__main__":
	main()
