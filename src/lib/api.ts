const BASE_URL = "https://pixel-vault-backend-tqww.onrender.com/api";

function getToken(): string | null {
  return localStorage.getItem("token");
}

function authHeaders(): HeadersInit {
  const token = getToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

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
  const res = await fetch(`${BASE_URL}/user/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  return res.json();
}

export async function login(email: string, password: string) {
  const res = await fetch(`${BASE_URL}/user/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  return res.json();
}

// Images
export async function searchImages(
  searchText: string = "",
  limit: number = 12,
  offset: number = 0
): Promise<SearchResponse> {
  const token = getToken();
  const res = await fetch(`${BASE_URL}/image/search`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ searchText, limit, offset }),
  });
  return res.json();
}

export async function uploadToCloudinary(file: File): Promise<any> {
  const token = getToken();
  const formData = new FormData();
  formData.append("image", file);
  const res = await fetch(`${BASE_URL}/image/minio-upload`, {
    method: "POST",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: formData,
  });
  return res.json();
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
  const token = getToken();
  const res = await fetch(`${BASE_URL}/image/save`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(data),
  });
  return res.json();
}
