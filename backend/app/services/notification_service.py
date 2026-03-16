import logging
import smtplib
from collections import Counter
from email.message import EmailMessage
from typing import Any, Sequence

from app.core.config import get_settings
from app.models.camera import Camera
from app.models.event import Event


logger = logging.getLogger(__name__)


class EmailNotificationService:
	def __init__(self) -> None:
		self.settings = get_settings()

	def is_enabled(self) -> bool:
		settings = self.settings
		return bool(
			settings.EMAIL_NOTIFICATIONS_ENABLED
			and settings.ALERT_EMAIL_TO
			and settings.SMTP_HOST
			and settings.SMTP_USERNAME
			and settings.SMTP_PASSWORD
		)

	def send_detection_alert(
		self,
		*,
		events: Sequence[Event],
		detections: Sequence[dict[str, Any]],
		camera: Camera | None = None,
	) -> None:
		if not events or not self.is_enabled():
			return

		settings = self.settings
		recipient = settings.ALERT_EMAIL_TO
		sender = settings.ALERT_EMAIL_FROM or settings.SMTP_USERNAME
		if not sender:
			logger.warning("Email notification skipped because sender email is not configured.")
			return

		counts = Counter(event.label for event in events)
		labels_summary = ", ".join(
			f"{label} x{count}" if count > 1 else label
			for label, count in sorted(counts.items())
		)
		first_event = events[0]
		occurred_at = first_event.occurred_at.isoformat() if first_event.occurred_at else "Unknown"

		message = EmailMessage()
		message["Subject"] = f"Detection alert: {labels_summary}"
		message["From"] = sender
		message["To"] = recipient
		message.set_content(self._build_message_body(events, detections, camera))

		try:
			with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=settings.SMTP_TIMEOUT_SECONDS) as server:
				if settings.SMTP_USE_TLS:
					server.starttls()
				server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
				server.send_message(message)
			logger.info(
				"Detection email sent to %s for %s at %s",
				recipient,
				labels_summary,
				occurred_at,
			)
		except Exception as exc:
			logger.exception("Failed to send detection email: %s", exc)

	def _build_message_body(
		self,
		events: Sequence[Event],
		detections: Sequence[dict[str, Any]],
		camera: Camera | None,
	) -> str:
		lines = [
			"A detection alert was triggered.",
			"",
			f"Recipient: {self.settings.ALERT_EMAIL_TO}",
			f"Triggered at: {events[0].occurred_at.isoformat() if events[0].occurred_at else 'Unknown'}",
			f"Camera ID: {events[0].camera_id if events[0].camera_id is not None else 'N/A'}",
			f"Camera name: {camera.name if camera else 'N/A'}",
			f"Camera location: {camera.location if camera and camera.location else 'N/A'}",
			f"Detected labels: {', '.join(event.label for event in events)}",
			"",
			"Detection details:",
		]

		for index, event in enumerate(events, start=1):
			detection = detections[index - 1] if index - 1 < len(detections) else {}
			bbox = detection.get("bbox") or (event.payload or {}).get("bbox")
			lines.extend(
				[
					f"{index}. Label: {event.label}",
					f"   Confidence: {event.confidence:.4f}",
					f"   Time: {event.occurred_at.isoformat() if event.occurred_at else 'Unknown'}",
					f"   Event ID: {event.id}",

				]
			)

		return "\n".join(lines)