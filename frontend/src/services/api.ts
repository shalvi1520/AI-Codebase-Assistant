import axios from "axios";

/*
Backend URL
Use environment variable if available
otherwise fallback to localhost backend
*/

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

/*
Axios client
*/

const client = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

/*
Upload ZIP Codebase
Calls FastAPI POST /upload
*/

export const uploadCodebase = async (file: File) => {
  try {
    const formData = new FormData();
    formData.append("file", file);

    const response = await client.post("/upload", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    return response.data;
  } catch (error: any) {
    console.error("Upload failed:", error);
    throw error;
  }
};

/*
Ask question about codebase
Calls FastAPI POST /query

Supports:
1️⃣ Normal chat response
2️⃣ Code Finder response
3️⃣ Conversation memory via session_id
*/

export const queryCodebase = async (
  question: string,
  repoName: string,
  topK: number = 3,
  sessionId: string = ""        // pass session ID for memory — empty = stateless
) => {
  try {
    const response = await client.post("/query", {
      repo_name:  repoName,
      question:   question,
      top_k:      topK,
      session_id: sessionId,
    });

    return response.data;
  } catch (error: any) {
    console.error("Query failed:", error);
    throw error;
  }
};

/*
Get file content
Used by Code Finder to open file in editor

Calls FastAPI GET /file
*/

export const getFileContent = async (
  repoName: string,
  filePath: string
) => {
  try {
    const response = await client.get("/file", {
      params: {
        repo_name: repoName,
        path: filePath,
      },
    });

    return response.data;
  } catch (error: any) {
    console.error("File fetch failed:", error);
    throw error;
  }
};

/*
Get repository file tree
Used for Codebase Visualizer

Calls FastAPI GET /repo_tree
*/

export const getRepoTree = async (repoName: string) => {
  try {
    const response = await client.get("/repo_tree", {
      params: {
        repo_name: repoName,
      },
    });

    return response.data;
  } catch (error: any) {
    console.error("Repo tree fetch failed:", error);
    throw error;
  }
};

/*
Clear conversation history for a session
Calls FastAPI POST /session/clear
*/

export const clearSessionHistory = async (sessionId: string) => {
  try {
    const response = await client.post("/session/clear", {
      session_id: sessionId,
    });

    return response.data;
  } catch (error: any) {
    console.error("Session clear failed:", error);
    throw error;
  }
};

/*
Get conversation history for a session
Calls FastAPI GET /session/history
*/

export const getSessionHistory = async (sessionId: string) => {
  try {
    const response = await client.get("/session/history", {
      params: {
        session_id: sessionId,
      },
    });

    return response.data;
  } catch (error: any) {
    console.error("Session history fetch failed:", error);
    throw error;
  }
};