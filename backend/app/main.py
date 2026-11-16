from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.api.routes import auth, documents, employee, requests
from app.config import settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Ensure upload directory exists
    upload_path = Path(settings.UPLOAD_DIR)
    upload_path.mkdir(parents=True, exist_ok=True)
    yield


app = FastAPI(
    title="NileOps Banking API",
    description="Banking Request Processing System with OCR and Verification",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API Routers
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(requests.router, prefix="/api/requests", tags=["requests"])
app.include_router(documents.router, prefix="/api/requests", tags=["documents"])
app.include_router(employee.router, prefix="/api/employee", tags=["employee"])

# Ensure upload directory exists for static mounting
Path(settings.UPLOAD_DIR).mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")


@app.get("/health")
def health_check():
    return {"status": "ok"}

