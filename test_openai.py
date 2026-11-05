from dotenv import load_dotenv
import os

print("Current folder:", os.getcwd())
print("Current folder contents:", os.listdir(os.getcwd()))

load_dotenv(dotenv_path=".env", override=True)

api_key = os.getenv("OPENAI_API_KEY")

print("Key loaded:", bool(api_key))
print("Key length:", len(api_key) if api_key else 0)
print("Starts with sk-:", api_key.startswith("sk-") if api_key else False)