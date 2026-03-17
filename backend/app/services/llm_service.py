from groq import Groq
import os
from dotenv import load_dotenv

load_dotenv()

client = Groq(api_key=os.getenv("GROQ_API_KEY"))


def generate_response(question, retrieved_code):

    if not retrieved_code:
        return "No relevant code was found in the repository."

    context_parts = []

    for item in retrieved_code:

        file = item.get("file", "unknown_file")
        code = item.get("code", "")

        context_parts.append(
            f"File: {file}\nCode:\n{code}"
        )

    context = "\n\n".join(context_parts)

    prompt = f"""
You are an expert software engineer helping a developer understand a codebase.

User Question:
{question}

Relevant Code Snippets:
{context}

Explain clearly how the code relates to the user's question.
If possible, reference the file names and functions in your explanation.
"""

    completion = client.chat.completions.create(
        model="llama-3.1-8b-instant",
        messages=[
            {"role": "user", "content": prompt}
        ],
        temperature=0.2
    )

    return completion.choices[0].message.content