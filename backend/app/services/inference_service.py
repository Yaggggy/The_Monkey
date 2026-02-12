from __future__ import annotations

from functools import lru_cache
from typing import Any, Dict, List

from PIL import Image
from ultralytics import YOLO

from app.core.config import get_settings


class InferenceService:
	def __init__(self, model_path: str) -> None:
		self.model = YOLO(model_path)
		self.allowed_labels = {label.lower() for label in get_settings().DETECTION_LABELS}

	def predict(self, image: Image.Image) -> List[Dict[str, Any]]:
		results = self.model.predict(source=image, verbose=False)
		if not results:
			return []

		detections = []
		result = results[0]
		names = result.names or {}
		boxes = result.boxes
		if boxes is None:
			return []

		for box in boxes:
			cls_id = int(box.cls[0])
			label = str(names.get(cls_id, cls_id)).lower()
			if self.allowed_labels and label not in self.allowed_labels:
				continue
			confidence = float(box.conf[0])
			xyxy = box.xyxy[0].tolist()
			detections.append(
				{
					"label": label,
					"confidence": confidence,
					"bbox": xyxy,
				}
			)
		return detections


@lru_cache
def get_inference_service() -> InferenceService:
	settings = get_settings()
	return InferenceService(settings.MODEL_PATH)
