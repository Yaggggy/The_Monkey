# The Monkey - Video Stream Inference System

A FastAPI-based real-time video stream inference system with YOLO model integration, email notifications, and frame-based object detection.

## Quick Start

### 1. Initialize the System

Before running the API server, initialize the database and default camera:

```bash
cd backend
python init.py
```

This will:
- Create the SQLite database
- Set up tables for cameras, events, and users
- Create a default camera with the stream URL (configurable via environment variables)
- Verify all configuration

### 2. Start the API Server

```bash
cd backend
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at: `http://localhost:8000`

### 3. Test Stream Connectivity

Before running inference, test your stream:

```bash
python manage_cameras.py test-stream --url "http://192.168.29.7:8080"
```

Expected output:
```
Testing stream: http://192.168.29.7:8080
✓ Stream test successful!
  - Image size: (1920, 1080)
  - Image format: JPEG
```

## Camera Management

### Add a New Camera

Via CLI:
```bash
python manage_cameras.py init-stream \
  --name "Living Room Camera" \
  --url "http://192.168.29.7:8080" \
  --location "Living Room"
```

Via API:
```bash
curl -X POST "http://localhost:8000/api/v1/cameras" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Living Room Camera",
    "stream_url": "http://192.168.29.7:8080",
    "location": "Living Room",
    "is_active": true
  }'
```

### List All Cameras

Via CLI:
```bash
python manage_cameras.py list
```

Via API:
```bash
curl "http://localhost:8000/api/v1/cameras"
```

### Delete a Camera

```bash
python manage_cameras.py delete --id 1
```

## 🔍 Video Stream Processing

### Test Stream (Get Single Frame)

```bash
curl "http://localhost:8000/api/v1/events/test-stream?stream_url=http://192.168.29.7:8080"
```

Response:
```json
{
  "status": "success",
  "stream_url": "http://192.168.29.7:8080",
  "image_size": [1920, 1080],
  "image_format": "JPEG",
  "message": "Stream is accessible and working"
}
```

### Run Inference on Single Snapshot

```bash
curl -X POST "http://localhost:8000/api/v1/events/infer-stream" \
  -H "Content-Type: application/json" \
  -d '{"camera_id": 1}'
```

Response:
```json
{
  "detections": [
    {
      "label": "person",
      "confidence": 0.95,
      "bbox": [100, 150, 300, 600]
    },
    {
      "label": "car",
      "confidence": 0.87,
      "bbox": [450, 200, 800, 450]
    }
  ]
}
```

### Start Live Inference Stream

This endpoint provides real-time streaming with continuous inference:

```bash
curl "http://localhost:8000/api/v1/events/live-stream?camera_id=1&confidence_threshold=0.8&fps=30"
```

Query Parameters:
- `camera_id` (int): Camera ID to use (optional if stream_url provided)
- `stream_url` (str): Direct stream URL (optional if camera_id provided)
- `confidence_threshold` (float): Minimum confidence for detections (0.0-1.0, default: 0.8)
- `fps` (int): Frame processing rate (1-60, default: 30)

The endpoint returns Server-Sent Events (SSE) with:
- Base64-encoded frame images
- Detection information (label, confidence)

Example using JavaScript:
```javascript
const eventSource = new EventSource(
  'http://localhost:8000/api/v1/events/live-stream?camera_id=1'
);

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Frame detections:', data.detections);
  // Display frame: data.frame (base64)
};

eventSource.onerror = (error) => {
  console.error('Stream error:', error);
  eventSource.close();
};
```

## Detection Data

### Get All Detection Events

```bash
curl "http://localhost:8000/api/v1/events?skip=0&limit=100"
```

### Get Events by Camera

```bash
curl "http://localhost:8000/api/v1/events?camera_id=1&skip=0&limit=50"
```

Response:
```json
[
  {
    "id": 1,
    "camera_id": 1,
    "user_id": null,
    "label": "person",
    "confidence": 0.95,
    "image_path": "detection_images/20240423_143022_cam1_person.jpg",
    "payload": {
      "bbox": [100, 150, 300, 600]
    },
    "occurred_at": "2024-04-23T14:30:22.123456"
  }
]
```

## Email Notifications

Enable email alerts when detections occur:

Set environment variables or `.env` file:
```env
EMAIL_NOTIFICATIONS_ENABLED=true
ALERT_EMAIL_TO=your-email@example.com
ALERT_EMAIL_FROM=sender@example.com
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_USE_TLS=true
```

When detections occur, an email will be sent with:
- Detection summary (labels and count)
- Camera information
- Timestamp and confidence scores
- Detection details with bounding boxes

## Environment Variables

Create a `.env` file in the `backend/` directory:

```env
# Database
DATABASE_URL=sqlite:///./app.db

# Model Configuration
MODEL_PATH=./best.pt
DETECTION_LABELS=["person", "car", "fire", "weapon", "accident", "fight"]

# API Configuration
PROJECT_NAME=The Monkey API
API_V1_STR=/api/v1
AUTH_MODE=stub

# CORS Origins
CORS_ORIGINS=["http://localhost:3000", "http://localhost:5173"]

# Email Notifications
EMAIL_NOTIFICATIONS_ENABLED=false
ALERT_EMAIL_TO=your-email@example.com
ALERT_EMAIL_FROM=sender@example.com
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_USE_TLS=true
SMTP_TIMEOUT_SECONDS=15

# Default Camera (for initialization)
DEFAULT_STREAM_URL=http://192.168.29.7:8080
DEFAULT_CAMERA_NAME=Default Camera
DEFAULT_CAMERA_LOCATION=Main Location
```

## Frame Storage

Detection frames are automatically saved to `backend/detection_images/` with naming:
- Format: `{TIMESTAMP}_{CAMERA_ID}_{LABELS}.jpg`
- Example: `20240423_143022_cam1_person_car.jpg`

## System Features

### Stream Connection Management
- Automatic reconnection on connection loss
- Configurable retry attempts
- Graceful error handling
- Multi-format stream support (MJPEG, H.264, etc.)

### Detection Processing
- Configurable confidence thresholds
- Smart detection debouncing (prevents duplicate saves)
- Confirmation threshold (3 consecutive frames)
- Cooldown period (5 seconds between saves)

### Database Operations
- Automatic event creation on detection
- Frame association with detection metadata
- Timestamp tracking
- Event queries by camera or time range

### Email Notifications
- HTML-formatted detection alerts
- Detection counts and summaries
- Camera metadata inclusion
- Automatic retry on failure

## Testing

### Full Workflow Test

```bash
# 1. Initialize system
python init.py

# 2. Test stream connectivity
python manage_cameras.py test-stream --url "http://192.168.29.7:8080"

# 3. Start API server in another terminal
python -m uvicorn app.main:app --reload

# 4. Test camera creation
curl -X POST "http://localhost:8000/api/v1/cameras" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Camera",
    "stream_url": "http://192.168.29.7:8080",
    "location": "Test Location",
    "is_active": true
  }'

# 5. Test single inference
curl -X POST "http://localhost:8000/api/v1/events/infer-stream" \
  -H "Content-Type: application/json" \
  -d '{"camera_id": 1}'

# 6. Start live stream
curl "http://localhost:8000/api/v1/events/live-stream?camera_id=1"
```

## API Documentation

Full interactive API documentation available at:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## Troubleshooting

### Stream Connection Failed
```
Error: Failed to open stream
```
**Solution:**
- Check stream URL format: `http://192.168.29.7:8080`
- Test connectivity: `python manage_cameras.py test-stream --url <your-url>`
- Verify network access to the stream
- Check firewall rules

### Model Not Found
```
Error: Model path does not exist
```
**Solution:**
- Ensure `best.pt` exists in `backend/` directory
- Update `MODEL_PATH` in `.env`
- Check file permissions

### Database Errors
```
Error: Failed to create event
```
**Solution:**
- Run initialization: `python init.py`
- Check database file permissions
- Clear database and reinitialize if corrupted

### Email Not Sending
```
Warning: Failed to send detection email
```
**Solution:**
- Verify SMTP credentials
- Check firewall allows SMTP (port 587)
- For Gmail: use App Passwords, not account password
- Enable "Less secure app access" if needed

## Project Structure

```
backend/
├── app/
│   ├── api/
│   │   ├── deps.py              # Dependency injection
│   │   └── v1/
│   │       ├── api.py           # Router setup
│   │       └── endpoints/
│   │           ├── cameras.py   # Camera management
│   │           ├── events.py    # Events & inference
│   │           └── users.py     # User management
│   ├── core/
│   │   ├── config.py           # Configuration
│   │   ├── logging.py          # Logging setup
│   │   └── security.py         # Auth & security
│   ├── db/
│   │   ├── base.py            # SQLAlchemy base
│   │   └── session.py         # DB session
│   ├── models/                 # SQLAlchemy models
│   ├── repositories/           # Data access layer
│   ├── schemas/               # Pydantic schemas
│   └── services/              # Business logic
├── manage_cameras.py           # CLI tool
├── init.py                     # Initialization
├── main.py                     # Entry point
└── requirements.txt            # Dependencies
```

## Notes

- Detection images are stored locally in `detection_images/`
- Events are stored in SQLite database (`app.db`)
- The system uses YOLO for real-time object detection
- Email notifications are optional and can be disabled
- Stream URLs support HTTP, HTTPS, and MJPEG formats

## Performance Optimization

For better performance:
- Increase `fps` parameter to process fewer frames
- Increase `confidence_threshold` to filter weak detections
- Process every Nth frame (currently set to every 5th frame)
- Use GPU acceleration if available (YOLO supports CUDA)

