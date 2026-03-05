from groq import Groq
import os
from dotenv import load_dotenv

load_dotenv()

client = Groq(api_key=os.getenv("GROQ_API_KEY"))

def generate_response(question, retrieved_code):

    context = "\n\n".join(
        [
            f"File: {item['file']}\nFunction: {item['function_name']}\nCode:\n{item['code']}"
            for item in retrieved_code
        ]
    )

    prompt = f"""
You are an expert software engineer.

A developer asked the following question:

{question}

Here are relevant parts of the codebase:

{context}

Explain clearly how the code answers the question.
"""

    completion = client.chat.completions.create(
        model="llama-3.1-8b-instant",
        messages=[
            {"role": "user", "content": prompt}
        ],
        temperature=0.2
    )

    return completion.choices[0].message.content