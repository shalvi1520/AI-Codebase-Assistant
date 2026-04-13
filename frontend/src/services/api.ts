import axios from "axios";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

const client = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});


/*
 * Upload ZIP Codebase
 * Calls FastAPI POST /upload
 */
export const uploadCodebase = async (file: File) => {
  try {
    const formData = new FormData();
    formData.append("file", file);

    const response = await client.post("/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    return response.data;
  } catch (error: any) {
    console.error("Upload failed:", error);
    throw error;
  }
};


/*
 * Upload from Git URL
 * Calls FastAPI POST /upload-git
 */
export const uploadFromGit = async (
  gitUrl: string,
  repoName: string = ""
) => {
  try {
    const response = await client.post("/upload-git", {
      git_url:   gitUrl,
      repo_name: repoName,
    });

    return response.data;
  } catch (error: any) {
    console.error("Git upload failed:", error);
    throw error;
  }
};


/*
 * Get commit log for a cloned repo
 * Calls FastAPI GET /commit-log?repo_name=...
 */
export const getCommitLog = async (repoName: string) => {
  try {
    const response = await client.get("/commit-log", {
      params: { repo_name: repoName },
    });

    return response.data;
  } catch (error: any) {
    console.error("Commit log fetch failed:", error);
    throw error;
  }
};


/*
 * Ask question about codebase
 * Calls FastAPI POST /query
 */
export const queryCodebase = async (
  question: string,
  repoName: string,
  topK: number = 3,
  sessionId: string = ""
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
 * Get file content
 * Calls FastAPI GET /file
 */
export const getFileContent = async (repoName: string, filePath: string) => {
  try {
    const response = await client.get("/file", {
      params: { repo_name: repoName, path: filePath },
    });

    return response.data;
  } catch (error: any) {
    console.error("File fetch failed:", error);
    throw error;
  }
};


/*
 * Get repository file tree
 * Calls FastAPI GET /repo_tree
 */
export const getRepoTree = async (repoName: string) => {
  try {
    const response = await client.get("/repo_tree", {
      params: { repo_name: repoName },
    });

    return response.data;
  } catch (error: any) {
    console.error("Repo tree fetch failed:", error);
    throw error;
  }
};


/*
 * Clear conversation history
 * Calls FastAPI POST /session/clear
 */
export const clearSessionHistory = async (sessionId: string) => {
  try {
    const response = await client.post("/session/clear", { session_id: sessionId });
    return response.data;
  } catch (error: any) {
    console.error("Session clear failed:", error);
    throw error;
  }
};


/*
 * Get conversation history
 * Calls FastAPI GET /session/history
 */
export const getSessionHistory = async (sessionId: string) => {
  try {
    const response = await client.get("/session/history", {
      params: { session_id: sessionId },
    });
    return response.data;
  } catch (error: any) {
    console.error("Session history fetch failed:", error);
    throw error;
  }
};


/*
 * Get complexity heatmap data for a repo  ← NEW
 * Calls FastAPI GET /heatmap?repo_name=...
 *
 * Returns:
 *   functions  — per-function list with complexity score + risk + file + lines
 *   by_file    — per-file aggregation (avg, max, count)
 *   summary    — totals: low/medium/high/critical counts, avg, max, worst fn/file
 */
export const getHeatmap = async (repoName: string) => {
  try {
    const response = await client.get("/heatmap", {
      params: { repo_name: repoName },
    });

    return response.data;
  } catch (error: any) {
    console.error("Heatmap fetch failed:", error);
    throw error;
  }
};