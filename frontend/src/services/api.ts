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
Now includes repo_name so backend searches the correct repo
*/

export const queryCodebase = async (
  question: string,
  repoName: string,
  topK: number = 3
) => {
  try {
    const response = await client.post("/query", {
      repo_name: repoName,
      question: question,
      top_k: topK,
    });

    return response.data;
  } catch (error: any) {
    console.error("Query failed:", error);
    throw error;
  }
};