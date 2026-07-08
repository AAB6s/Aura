# AURA

AURA is a full-stack AI safety platform focused on detection, prevention, and support in gender-based violence cases. It brings several specialized models into one interface for analyzing text, images, video, audio, documents, live camera streams, and structured risk signals.

## Overview

The project is split into two main parts:

| Layer | Folder | Role |
|---|---|---|
| Frontend | `frontend/` | Web interface for model selection, uploads, dashboards, live stream preview, resources, and user guidance. |
| Backend | `backend/` | FastAPI service exposing the detection models, document intelligence pipeline, media safety scan, and live stream tools. |

The platform is designed as a modular proof of concept: each AI capability is isolated in its own backend module and exposed through a unified frontend experience.

## Main Features

- Media safety scan for images, videos, and audio.
- Sexism detection from image content.
- Image authenticity detection for AI-generated or fake visuals.
- Text authenticity detection for human vs AI-generated text.
- Document intelligence with OCR, layout extraction, evidence analysis, and legal RAG.
- Audio violence context analysis with acoustic event detection.
- Propagation prediction from structured risk indicators.
- Biometric heartbeat and stress signal analysis.
- Weapon, face, threat, and violence detection modules.
- RTSP live camera preview with real-time tool selection.
- Clean dashboard for uploads, results, confidence scores, and analysis history.

## AI Modules

| Module | Input | Purpose |
|---|---|---|
| `media_safety_scan` | image, video, audio | Runs selected safety checks across multiple media types. |
| `sexism_detection` | image | Detects sexist visual content. |
| `image_authenticity_detection` | image | Estimates whether an image is real or AI-generated. |
| `text_authenticity_detection` | text | Estimates whether text is human-written or AI-generated. |
| `document_intelligence_rag` | PDF, image, DOCX, TXT, JSON, XLSX | Extracts document context, retrieves legal references, and generates structured feedback. |
| `propagation_prediction` | structured features | Predicts virality and spread risk. |
| `biometric_heartbeat_detection` | HRV and signal features | Estimates stress and danger-related physiological patterns. |
| `audio_violence_detection` | audio | Detects critical sound events and acoustic context. |
| `weapon_detection` | image, video | Detects weapons with bounding boxes. |
| `face_detection` | image, video | Detects faces for visual context. |
| `threat_detection` | image, video | Detects threat-related visual signals. |
| `video_violence_detection` | image, video | Detects violent scenes or fight-related content. |

## Tech Stack

### Frontend

- React 19
- TypeScript
- TanStack Router and TanStack Start
- Vite
- Tailwind CSS
- shadcn/ui and Radix UI
- Recharts
- HLS.js

### Backend

- Python
- FastAPI
- Uvicorn
- PyTorch and Torchvision
- TensorFlow
- OpenCV
- Ultralytics
- Transformers
- Librosa and SoundFile
- PyMuPDF, python-docx, OpenPyXL
- scikit-learn and XGBoost
- Tesseract OCR support

## Project Structure

```text
.
|-- backend/
|   |-- app/                         FastAPI app, routers, services
|   |-- audio_violence_detection/    Audio context pipeline
|   |-- document_intelligence_rag/    OCR, layout analysis, RAG, legal knowledge
|   |-- image_authenticity_detection/
|   |-- sexism_detection/
|   |-- text_authenticity_detection/
|   |-- propagation_prediction/
|   |-- biometric_heartbeat_detection/
|   |-- weapon_detection/
|   |-- face_detection/
|   |-- threat_detection/
|   `-- video_violence_detection/
|
|-- frontend/
|   |-- src/routes/                  Pages and route structure
|   |-- src/components/              UI components
|   |-- src/lib/                     API client and model registry
|   `-- src/assets/                  Visual assets
|
|-- run_demo.bat                     Windows demo launcher
|-- run_demo.sh                      Cross-platform demo launcher
`-- README.md
```

## Run the Demo

### Windows

Double-click:

```text
run_demo.bat
```

The script installs dependencies, starts the backend on port `8000`, starts the frontend on port `5173`, and opens the web app.

### Manual Run

Backend:

```bash
python -m pip install -r backend/requirements.txt
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000
```

Frontend:

```bash
cd frontend
npm install
npm run dev -- --host 127.0.0.1 --port 5173
```

Open:

```text
http://127.0.0.1:5173
```

## Model Files

Large model weights are expected inside each module's `models/` folder and are ignored by Git. This keeps the repository clean while allowing the platform to load trained checkpoints locally.

Typical model folders:

```text
backend/*/models/
```

Supported checkpoint formats include:

```text
.pt, .pth, .keras, .joblib
```

## Notes

AURA is an engineering prototype for AI-assisted safety analysis. It is meant to organize signals, demonstrate model integration, and support human review. It does not replace emergency services, legal professionals, healthcare professionals, or victim-support organizations.
