# AI Codebase Assistant

AI Codebase Assistant is an intelligent repository analysis and code understanding platform built using Generative AI, Large Language Models (LLMs), and Retrieval-Augmented Generation (RAG).

The application enables developers to interact with large codebases using natural language queries, semantic search, automated documentation generation, and dependency analysis.

---

# Features

- Natural language interaction with repositories
- Repository upload and parsing
- Semantic code search using embeddings
- Retrieval-Augmented Generation (RAG) based querying
- Automatic documentation generation
- Dependency graph generation
- Multi-file contextual analysis
- Bug and security issue detection
- Multi-language support
- REST API support using FastAPI

---

# Technology Stack

## Frontend
- React.js / Next.js
- TypeScript
- Tailwind CSS

## Backend
- FastAPI
- Python

## AI and Machine Learning
- Groq API
- LLaMA 3
- Sentence Transformers
- Vector Embeddings
- ChromaDB / FAISS

## Additional Libraries
- GitPython
- NetworkX
- Uvicorn
- Pydantic

---

# System Architecture

```text
User Query
    ↓
Frontend Interface
    ↓
FastAPI Backend
    ↓
Repository Parsing
    ↓
Code Chunking
    ↓
Embedding Generation
    ↓
Vector Database
    ↓
Similarity Search (RAG)
    ↓
LLM Response Generation
    ↓
Final Response
```

---

# Project Structure

```text
AI-Codebase-Assistant/
│
├── backend/
│   ├── app/
│   │   ├── api/
│   │   ├── core/
│   │   ├── models/
│   │   ├── services/
│   │   ├── utils/
│   │   └── main.py
│   │
│   ├── requirements.txt
│   └── .env
│
├── frontend/
│   ├── src/
│   ├── components/
│   └── package.json
│
├── README.md
│
└── venv/
```

---

# Installation

## Clone Repository

```bash
git clone <repository-url>
cd AI-Codebase-Assistant
```

---

# Backend Setup

## Create Virtual Environment

### Windows

```bash
python -m venv venv
venv\Scripts\activate
```

### Linux / macOS

```bash
python3 -m venv venv
source venv/bin/activate
```

---

## Install Dependencies

```bash
pip install -r requirements.txt
```

---

## Configure Environment Variables

Create a `.env` file inside the backend directory.

```env
GROQ_API_KEY=your_api_key
```

---

## Run Backend Server

```bash
cd backend
uvicorn app.main:app --reload
```

Backend server runs on:

```text
http://127.0.0.1:8000
```

API Documentation:

```text
http://127.0.0.1:8000/docs
```

---

# Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on:

```text
http://localhost:3000
```

---

# Workflow

## Step 1: Repository Upload
The user uploads a repository or provides a GitHub repository link.

## Step 2: Repository Parsing
The system extracts:
- Files
- Classes
- Functions
- Imports
- Dependencies

## Step 3: Code Chunking
Large files are divided into smaller semantic chunks.

## Step 4: Embedding Generation
Embeddings are generated for each code chunk using transformer models.

## Step 5: Vector Storage
Embeddings are stored inside a vector database for similarity search.

## Step 6: Query Processing
User queries are converted into embeddings and matched against relevant code chunks.

## Step 7: Response Generation
Relevant context is passed to the LLM to generate accurate responses.

---

# Example Queries

```text
Explain the authentication flow
```

```text
Find bugs in upload.py
```

```text
Generate documentation for parser.py
```

```text
Identify security vulnerabilities in the repository
```

```text
Explain how API routing is implemented
```

---

# Applications

- Developer onboarding
- Repository understanding
- Automated documentation
- AI-assisted debugging
- Semantic code search
- Security analysis
- Software maintenance

---

# Future Enhancements

- GitHub integration
- VS Code extension
- Multi-LLM support
- Pull request analysis
- Test case generation
- Advanced security auditing

---

# Academic Relevance

This project demonstrates practical implementation of:

- Generative AI
- Large Language Models (LLMs)
- Retrieval-Augmented Generation (RAG)
- Natural Language Processing
- Semantic Search
- Vector Databases
- Software Engineering Principles

---

# Conclusion

AI Codebase Assistant provides an intelligent approach to understanding and analyzing software repositories using Generative AI and Retrieval-Augmented Generation techniques.

The project combines semantic search, vector embeddings, and large language models to enable efficient repository interaction and automated software analysis.

