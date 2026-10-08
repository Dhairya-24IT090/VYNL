from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="VYNL Backend",
    description="Backend service for VYNL music platform",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"], # Vite frontend
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from app.api import auth, recommendations, library, playlists, history, onboarding

app.include_router(auth.router)
app.include_router(recommendations.router)
app.include_router(library.router)
app.include_router(playlists.router)
app.include_router(history.router)
app.include_router(onboarding.router)

@app.get("/health")
async def health_check():
    return {"status": "ok"}
