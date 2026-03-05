from fastapi import FastAPI
from app.api import upload
from app.api import query

app = FastAPI()

app.include_router(upload.router)
app.include_router(query.router)

@app.get("/")
def home():
    return {"message": "AI Codebase Assistant is running"}