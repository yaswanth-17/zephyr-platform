"""
main.py — FastAPI application entry point

Run with:
    uvicorn main:app --reload --port 8000
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from core.config import settings
from core.datastore import store
from api.routes.dts import router as dts_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: load all JSON data into memory
    print("\n[startup] Loading Zephyr data...")
    store.load(
        bindings_path=settings.bindings_json,
        boards_path=settings.boards_json,
    )
    print(f"[startup] Ready — {len(store.bindings)} bindings, {len(store.boards)} boards\n")
    yield
    # Shutdown (nothing to clean up)


app = FastAPI(
    title="Zephyr Learning Platform API",
    version="0.1.0",
    description="API for the Zephyr DTS / CMake / YAML learning platform",
    lifespan=lifespan,
)

# CORS — allow the Vite dev server on :5173
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount all routes under /api
app.include_router(dts_router, prefix="/api")


@app.get("/")
def root():
    return {
        "status": "running",
        "bindings_loaded": len(store.bindings),
        "boards_loaded":   len(store.boards),
        "docs": "/docs",
    }
