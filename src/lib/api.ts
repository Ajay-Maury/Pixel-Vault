import axios, { AxiosInstance } from "axios";

let BASE_URL = (import.meta.env.VITE_BASE_URL as string) || "https://pixel-vault-backend-tqww.onrender.com/api";

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
    config.headers.set("Authorization", `Bearer ${token}`);
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
  const res = await api.post(`/user/register`, { email, password });
  return res.data;
}

export async function login(email: string, password: string) {
  const res = await api.post(`/user/login`, { email, password });
  return res.data;
}

// Images
export async function searchImages(
  searchText: string = "",
  limit: number = 12,
  offset: number = 0
): Promise<SearchResponse> {
  const res = await api.post(`/image/search`, { searchText, limit, offset });
  return res.data as SearchResponse;
}

export async function uploadToCloudinary(file: File): Promise<any> {
  const formData = new FormData();
  formData.append("image", file);
  const res = await api.post(`/image/minio-upload`, formData);
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
  const res = await api.post(`/image/save`, data);
  return res.data;
}

export async function deleteImage(id: string): Promise<any> {
  const res = await api.delete(`/image/${id}`);
  return res.data;
}

export async function updateImage(
  id: string,
  data: {
    title: string;
    description: string;
    keywords: string;
    isPrivate: boolean;
  }
): Promise<any> {
  const res = await api.put(`/image/${id}`, data);
  return res.data;
}
