from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.files import router as file_router



# Import API routers
from app.api.upload import router as upload_router
from app.api.query import router as query_router


# -------------------------------------------------
# Create FastAPI app
# -------------------------------------------------
app = FastAPI(
    title="AI Codebase Assistant API",
    description="Backend for CodeLens AI – AI powered codebase understanding",
    version="1.0.0",
)


# -------------------------------------------------
# CORS Configuration
# Allows Next.js frontend to communicate with API
# -------------------------------------------------
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# -------------------------------------------------
# Register API Routers
# -------------------------------------------------
app.include_router(upload_router, tags=["Upload"])
app.include_router(query_router, tags=["Query"])
app.include_router(file_router)


# -------------------------------------------------
# Root endpoint
# -------------------------------------------------
@app.get("/")
async def health_check():
    return {
        "status": "running",
        "service": "AI Codebase Assistant Backend",
        "version": "1.0.0"
    }


# -------------------------------------------------
# Detailed health endpoint
# -------------------------------------------------
@app.get("/health")
async def detailed_health():
    return {
        "api": "ok",
        "upload_route": "/upload",
        "query_route": "/query",
        "docs": "/docs"
    }