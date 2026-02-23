import axios, { AxiosInstance } from "axios";

let BASE_URL = (import.meta.env.VITE_BASE_URL as string) || "";

if (!BASE_URL) {
  throw new Error("VITE_BASE_URL is not defined");
}

// Remove surrounding quotes and any trailing semicolons that may come from a
// poorly formatted .env (e.g. `VITE_BASE_URL="https://...";`). Also trim.
BASE_URL = BASE_URL.replace(/^['"]+|['";]+$/g, "").trim();

if (BASE_URL.endsWith("/")) {
  BASE_URL = BASE_URL.slice(0, BASE_URL.length - 1);
}

function getToken(): string | null {
  return localStorage.getItem("token");
}

const api: AxiosInstance = axios.create({
  baseURL: BASE_URL,
});

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers = config.headers || {};
    (config.headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
  }
  return config;
});

export interface ImageRecord {
  id: string;
  title: string;
  description: string;
  image_url: string;
  width: number;
  height: number;
  size: number;
  keywords: string[];
  is_private?: boolean;
  user_id?: string;
  uploaded_at?: string;
}

export interface SearchResponse {
  data: ImageRecord[];
  totalCount: number;
}

// Auth
export async function register(email: string, password: string) {
  const res = await api.post(`/user/register`, { email, password }, { headers: { "Content-Type": "application/json" } });
  return res.data;
}

export async function login(email: string, password: string) {
  const res = await api.post(`/user/login`, { email, password }, { headers: { "Content-Type": "application/json" } });
  return res.data;
}

// Images
export async function searchImages(
  searchText: string = "",
  limit: number = 12,
  offset: number = 0
): Promise<SearchResponse> {
  const res = await api.post(
    `/image/search`,
    { searchText, limit, offset },
    { headers: { "Content-Type": "application/json" } }
  );
  return res.data as SearchResponse;
}

export async function uploadToCloudinary(file: File): Promise<any> {
  const formData = new FormData();
  formData.append("image", file);
  const res = await api.post(`/image/minio-upload`, formData, {
    headers: {
      // Let the browser set Content-Type with boundary for multipart
    },
  });
  return res.data;
}

export async function saveImage(data: {
  title: string;
  description: string;
  keywords: string;
  height: number;
  width: number;
  imageUrl: string;
  size: number;
  isPrivate?: boolean;
}): Promise<any> {
  const res = await api.post(`/image/save`, data, { headers: { "Content-Type": "application/json" } });
  return res.data;
}
