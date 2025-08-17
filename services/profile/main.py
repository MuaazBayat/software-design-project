from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os

try:
    from dotenv import load_dotenv
    load_dotenv()
except Exception:
    pass

def create_app() -> FastAPI:
    app = FastAPI(
        title=os.getenv("SERVICE_NAME", "Placeholder API"),
        version="0.1.0",
        docs_url="/docs",           # Swagger UI
        redoc_url="/redoc"          # ReDoc
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_methods=["*"],
        allow_headers=["*"],
        allow_credentials=True,
    )

    @app.get("/", tags=["health"])
    def root():
        return {"status": "ok", "service": os.getenv("SERVICE_NAME", "placeholder")}

    @app.get("/ping", tags=["health"])
    def ping():
        return {"pong": True}

    return app

app = create_app()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="127.0.0.1",
        port=int(os.getenv("PORT", "8000")),
        reload=True
    )
