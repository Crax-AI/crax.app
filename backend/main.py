import uvicorn
from app import app


def main():
    """Run the FastAPI application"""
    uvicorn.run(app, host="0.0.0.0", port=8000)


if __name__ == "__main__":
    main()
