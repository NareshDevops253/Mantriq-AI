from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from database.db import get_db_connection
from dotenv import load_dotenv
from openai import OpenAI
import os

# Load environment variables
load_dotenv(override=True)

api_key = os.getenv("OPENAI_API_KEY")

if not api_key:
    raise RuntimeError("OPENAI_API_KEY is missing from .env")

client = OpenAI(api_key=api_key)
api_key = os.getenv("OPENAI_API_KEY")

if not api_key:
    raise RuntimeError("OPENAI_API_KEY is missing from .env")

client = OpenAI(api_key=api_key)

# Create FastAPI application
app = FastAPI(title="Route.AI API")

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:5500",
        "http://localhost:5500",
        "null"
    ],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Request validation
class ChatRequest(BaseModel):
    session_id: str
    message: str


# Home API
@app.get("/")
def home():
    return {
        "message": "Route.AI backend is running!"
    }


# Database connection test
@app.get("/db-check")
def db_check():

    connection = None
    cursor = None

    try:
        connection = get_db_connection()
        cursor = connection.cursor()

        cursor.execute("SELECT DATABASE()")
        database_name = cursor.fetchone()[0]

        return {
            "status": "success",
            "database": database_name
        }

    except Exception as error:
        raise HTTPException(status_code=500, detail=str(error))

    finally:
        if cursor:
            cursor.close()

        if connection and connection.is_connected():
            connection.close()


# AI Chat API
@app.post("/chat")
def chat(request: ChatRequest):

    connection = None
    cursor = None

    try:
        # Step 1: Get user message
        user_message = request.message

        # Step 2: Send message to OpenAI
        response = client.responses.create(
            model="gpt-5",
            input=user_message
        )

        # Step 3: Get AI-generated response
        ai_response = response.output_text

        # Step 4: Connect to MySQL
        connection = get_db_connection()
        cursor = connection.cursor()

        # Step 5: Save conversation
        query = """
            INSERT INTO chat_messages
            (session_id, user_message, ai_response)
            VALUES (%s, %s, %s)
        """

        cursor.execute(
            query,
            (
                request.session_id,
                user_message,
                ai_response
            )
        )

        connection.commit()

        # Step 6: Return response
        return {
            "session_id": request.session_id,
            "question": user_message,
            "reply": ai_response,
            "saved": True
        }

    except Exception as error:

        if connection and connection.is_connected():
            connection.rollback()

        raise HTTPException(
            status_code=500,
            detail=str(error)
        )

    finally:

        if cursor:
            cursor.close()

        if connection and connection.is_connected():
            connection.close()


# Chat history API
@app.get("/chat-history/{session_id}")
def chat_history(session_id: str):

    connection = None
    cursor = None

    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        cursor.execute(
            """
            SELECT id, user_message, ai_response, created_at
            FROM chat_messages
            WHERE session_id = %s
            ORDER BY id ASC
            """,
            (session_id,)
        )

        return {
            "messages": cursor.fetchall()
        }

    except Exception as error:
        raise HTTPException(status_code=500, detail=str(error))

    finally:
        if cursor:
            cursor.close()

        if connection and connection.is_connected():
            connection.close()


# Simple AI test API
@app.get("/ask-ai")
def ask_ai():

    try:
        response = client.responses.create(
            model="gpt-5",
            input="What is Python?"
        )

        return {
            "question": "What is Python?",
            "answer": response.output_text
        }

    except Exception as error:
        raise HTTPException(status_code=500, detail=str(error))


# Run application
if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "RouteApp:app",
        host="127.0.0.1",
        port=8000,
        reload=True
    )
