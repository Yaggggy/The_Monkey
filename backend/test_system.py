#!/usr/bin/env python
"""
Test script to validate the complete workflow.
Tests database, model, stream connectivity, and inference capabilities.
"""

import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent))

from app.db.session import SessionLocal, engine
from app.db.base import Base
from app.models.camera import Camera
from app.services.inference_service import get_inference_service
from app.api.v1.endpoints.events import _fetch_snapshot
from PIL import Image


def test_database():
	"""Test database connectivity and operations."""
	print("Testing Database...")
	try:
		Base.metadata.create_all(bind=engine)
		db = SessionLocal()
		result = db.query(Camera).first()
		db.close()
		print("  Database connection successful")
		return True
	except Exception as e:
		print(f"  Database connection failed: {e}")
		return False


def test_model():
	"""Test model loading and basic inference."""
	print("\nTesting Model...")
	try:
		inference = get_inference_service()
		
		# Create a simple test image
		test_image = Image.new('RGB', (640, 480), color='blue')
		
		# Run inference
		detections = inference.predict(test_image)
		print(f"  Model loaded successfully")
		print(f"  Inference test completed (detections: {len(detections)})")
		return True
	except Exception as e:
		print(f"  Model test failed: {e}")
		return False


def test_stream():
	"""Test stream connectivity."""
	print("\nTesting Stream Connectivity...")
	stream_url = "http://192.168.29.7:8080"
	try:
		image = _fetch_snapshot(stream_url)
		print(f"  Stream connected successfully")
		print(f"  Stream image size: {image.size}")
		return True
	except Exception as e:
		print(f"  Stream test failed: {e}")
		print(f"  This is expected if stream is not accessible")
		print(f"  Stream URL: {stream_url}")
		print(f"  Verify the stream is running and accessible")
		return None  # Don't fail, just warn


def test_inference_on_stream():
	"""Test running inference on a stream frame."""
	print("\nTesting Stream Inference...")
	stream_url = "http://192.168.29.7:8080"
	try:
		image = _fetch_snapshot(stream_url)
		inference = get_inference_service()
		detections = inference.predict(image)
		print(f"  Stream inference completed")
		print(f"  Detections found: {len(detections)}")
		if detections:
			for det in detections[:3]:  # Show first 3
				print(f"    - {det['label']}: {det['confidence']:.2%} confidence")
		return True
	except Exception as e:
		print(f"  Stream inference failed: {e}")
		return None


def test_event_creation():
	"""Test creating events in database."""
	print("\nTesting Event Creation...")
	try:
		from app.services.event_service import EventService
		from app.schemas.event import EventCreate
		
		db = SessionLocal()
		service = EventService()
		
		# Create test event
		event_data = EventCreate(
			camera_id=None,
			user_id=None,
			label="test",
			confidence=0.95,
			image_path=None,
			payload={"bbox": [0, 0, 100, 100]}
		)
		event = service.create_event(db, event_data)
		db.close()
		print(f"  Event created successfully (ID: {event.id})")
		return True
	except Exception as e:
		print(f"  Event creation failed: {e}")
		return False


def print_summary():
	"""Print test summary and instructions."""
	print("\nTEST SUMMARY")
	print("\nNext Steps:")
	print("  1. Start the API server:")
	print("     python -m uvicorn app.main:app --reload")
	print("\n  2. In another terminal, test endpoints:")
	print("     curl 'http://localhost:8000/health'")
	print("     curl 'http://localhost:8000/api/v1/cameras'")
	print("\n  3. Test stream connectivity:")
	print("     python manage_cameras.py test-stream --url http://192.168.29.7:8080")
	print("\n  4. Start live inference:")
	print("     curl 'http://localhost:8000/api/v1/events/live-stream?camera_id=1'")
	print("\n")


def main():
	"""Run all tests."""
	print("\nTHE MONKEY - SYSTEM VALIDATION\n")

	results = {
		"Database": test_database(),
		"Model": test_model(),
		"Stream": test_stream(),
		"Event Creation": test_event_creation(),
	}

	# Optional test
	if results["Stream"]:
		results["Stream Inference"] = test_inference_on_stream()

	print("\nRESULTS\n")

	passed = sum(1 for v in results.values() if v is True)
	warned = sum(1 for v in results.values() if v is None)
	failed = sum(1 for v in results.values() if v is False)

	for test_name, result in results.items():
		if result is True:
			status = "PASS"
		elif result is False:
			status = "FAIL"
		else:
			status = "WARN"
		print(f"{test_name:.<40} {status}")

	print("\n" + "=" * 60)
	print(f"SUMMARY: {passed} passed, {warned} warned, {failed} failed")
	print("=" * 60)

	if failed > 0:
		print("\nSome tests failed. Check the errors above.")
		return False

	if warned > 0:
		print("\nSome tests had warnings but system should work.")

	print_summary()
	return True


if __name__ == "__main__":
	success = main()
	sys.exit(0 if success else 1)
