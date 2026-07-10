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
  privateCount?: number;
  publicCount?: number;
}

export interface ProfileRecord {
  id?: string;
  email: string;
  firstName: string;
  lastName: string;
  gender?: string | null;
  uploadCount?: number;
}

export interface UserLite {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
}

export type InviteStatus = "pending" | "accepted" | "rejected";

export interface ShareGroup {
  id: string;
  name: string;
  ownerId?: string;
  isOwner?: boolean;
  memberCount?: number;
  imageCount?: number;
  createdAt?: string;
  role?: "owner" | "member";
}

export interface GroupMember {
  id: string;            // memberId used in accept/reject/remove
  email: string;
  status: InviteStatus;
  userId?: string;
  firstName?: string;
  lastName?: string;
  invitedAt?: string;
}

export interface GroupInvite {
  id: string;            // memberId
  status: InviteStatus;
  invitedAt?: string;
  group: { id: string; name: string; ownerEmail?: string };
}

export interface GroupImageItem {
  id: string;
  addedAt: string;
  addedBy: { id: string; email: string; firstName?: string; lastName?: string };
  image: ImageRecord;
}

export interface GroupImagesResponse {
  group: { id: string; name: string };
  data: GroupImageItem[];
  totalCount: number;
  privateCount?: number;
  publicCount?: number;
  limit?: number;
  offset?: number;
}

export interface DownloadRecord {
  id: string;
  downloadedAt: string;
  // Nested shape returned by backend
  image?: { id: string; title?: string; image_url?: string };
  downloader?: { id?: string; email?: string; firstName?: string; lastName?: string };
  // Legacy/flat fallbacks
  imageId?: string;
  imageUrl?: string;
  imageTitle?: string;
  userId?: string;
  userEmail?: string;
}

export interface DownloadsSummary {
  totalDownloads: number;
  uniqueUsers?: number;
  topImages?: { imageId: string; title?: string; imageUrl?: string; count: number }[];
  topUsers?: { userId?: string; email?: string; firstName?: string; lastName?: string; count: number }[];
  [key: string]: any;
}

// Auth
export async function register(
  email: string,
  password: string,
  firstName: string,
  lastName: string,
  gender: string
) {
  const res = await api.post(`/user/register`, {
    email,
    password,
    firstName,
    lastName,
    gender,
  });
  return res.data;
}

export async function login(email: string, password: string) {
  const res = await api.post(`/user/login`, { email, password });
  return res.data;
}

export async function changePassword(
  currentPassword: string,
  newPassword: string
): Promise<any> {
  try {
    const res = await api.put(`/user/change-password`, { currentPassword, newPassword });
    return { success: true, message: res.data.message || "Password changed successfully" };
  } catch (error) {
    return { success: false, message: "Error changing password" };
  }
}

export async function getProfile() {
  const res = await api.get(`/user/profile`);
  return res.data;
}

export async function updateProfile(data: {
  firstName: string;
  lastName: string;
  gender?: string;
}) {
  const res = await api.put(`/user/profile`, data);
  return res.data;
}

export async function searchUsers(
  email: string,
  limit: number = 10,
  signal?: AbortSignal,
): Promise<UserLite[]> {
  const res = await api.get(`/user/search`, { params: { email, limit }, signal });
  const data = res.data;
  if (Array.isArray(data)) return data as UserLite[];
  if (Array.isArray(data?.data)) return data.data as UserLite[];
  if (Array.isArray(data?.users)) return data.users as UserLite[];
  return [];
}

// Images
export async function searchImages(
  searchText: string = "",
  limit: number = 12,
  offset: number = 0,
  myLibrary: boolean = false
): Promise<SearchResponse> {
  const res = await api.post(`/image/search`, { searchText, limit, offset, myLibrary });
  return res.data as SearchResponse;
}

export interface CloudinaryUpload {
  secure_url: string;
  url?: string;
  width: number;
  height: number;
  size: number;
  originalName?: string;
}

export async function uploadToCloudinary(file: File): Promise<any> {
  const formData = new FormData();
  formData.append("image", file);
  const res = await api.post(`/image/minio-upload`, formData);
  return res.data;
}

export async function uploadImagesBatch(files: File[]): Promise<{ uploads: CloudinaryUpload[] }> {
  const formData = new FormData();
  files.forEach((f) => formData.append("images", f));
  const res = await api.post(`/image/minio-upload`, formData);
  return res.data;
}

export async function uploadSingleImage(
  file: File,
  onProgress?: (percent: number) => void
): Promise<CloudinaryUpload> {
  const formData = new FormData();
  formData.append("images", file);
  const res = await api.post(`/image/minio-upload`, formData, {
    onUploadProgress: (e) => {
      if (!onProgress) return;
      const total = e.total ?? file.size;
      if (total > 0) onProgress(Math.min(100, Math.round((e.loaded / total) * 100)));
    },
  });
  const upload = res.data?.uploads?.[0];
  if (!upload) throw new Error("Upload failed: empty response");
  return upload as CloudinaryUpload;
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

export async function saveImagesBatch(data: {
  title: string;
  description: string;
  keywords: string;
  isPrivate?: boolean;
  imageUrls: { imageUrl: string; width: number; height: number; size: number }[];
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

// ── Bulk image actions ──────────────────────────────────────────────────────
export async function bulkUpdatePrivacy(imageIds: string[], isPrivate: boolean): Promise<any> {
  const res = await api.post(`/image/bulk/privacy`, { imageIds, isPrivate });
  return res.data;
}

export async function bulkDeleteImages(imageIds: string[]): Promise<any> {
  const res = await api.post(`/image/bulk/delete`, { imageIds });
  return res.data;
}

// ── Share Groups ────────────────────────────────────────────────────────────
function unwrapArray<T>(data: any): T[] {
  if (Array.isArray(data)) return data as T[];
  if (Array.isArray(data?.data)) return data.data as T[];
  if (Array.isArray(data?.groups)) return data.groups as T[];
  if (Array.isArray(data?.invites)) return data.invites as T[];
  if (Array.isArray(data?.members)) return data.members as T[];
  if (Array.isArray(data?.downloads)) return data.downloads as T[];
  return [];
}

export async function createGroup(name: string): Promise<ShareGroup> {
  const res = await api.post(`/share-groups`, { name });
  return (res.data?.data ?? res.data) as ShareGroup;
}

export async function listMyOwnedGroups(): Promise<ShareGroup[]> {
  const res = await api.get(`/share-groups/my-owned`);
  return unwrapArray<ShareGroup>(res.data);
}

export async function listMyJoinedGroups(): Promise<ShareGroup[]> {
  const res = await api.get(`/share-groups/my-joined`);
  return unwrapArray<ShareGroup>(res.data);
}

export async function listMyInvites(status?: InviteStatus): Promise<GroupInvite[]> {
  const res = await api.get(`/share-groups/my-invites`, {
    params: status ? { status } : undefined,
  });
  return unwrapArray<GroupInvite>(res.data);
}

export async function getGroup(id: string): Promise<ShareGroup & { members?: GroupMember[] }> {
  const res = await api.get(`/share-groups/${id}`);
  const payload = res.data?.data ?? res.data;

  if (payload?.group) {
    const groupPayload = payload.group;
    const members = Array.isArray(payload.members)
      ? payload.members
      : Array.isArray(groupPayload?.members)
        ? groupPayload.members
        : undefined;
    return {
      ...payload,
      ...groupPayload,
      members,
    } as ShareGroup & { members?: GroupMember[] };
  }

  return payload as ShareGroup & { members?: GroupMember[] };
}

export async function inviteToGroup(id: string, emails: string[]): Promise<any> {
  const res = await api.post(`/share-groups/${id}/invite`, { emails });
  return res.data;
}

export async function acceptInvite(memberId: string): Promise<any> {
  const res = await api.post(`/share-groups/invites/${memberId}/accept`);
  return res.data;
}

export async function rejectInvite(memberId: string): Promise<any> {
  const res = await api.post(`/share-groups/invites/${memberId}/reject`);
  return res.data;
}

export interface GroupImagesQuery {
  searchText?: string;
  keyword?: string;
  visibility?: "all" | "public" | "private";
  uploaderUserId?: string;
  fromDate?: string;
  toDate?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  limit?: number;
  offset?: number;
}

export async function getGroupImages(id: string, query: GroupImagesQuery = {}): Promise<GroupImagesResponse> {
  const res = await api.get(`/share-groups/${id}/images`, { params: query });
  return res.data as GroupImagesResponse;
}

export async function addImagesToGroup(id: string, imageIds: string[]): Promise<any> {
  const res = await api.post(`/share-groups/${id}/images/add`, { imageIds });
  return res.data;
}

export async function removeImagesFromGroup(id: string, imageIds: string[]): Promise<any> {
  const res = await api.post(`/share-groups/${id}/images/remove`, { imageIds });
  return res.data;
}

export async function recordGroupDownload(id: string, imageId: string): Promise<{ downloadUrl?: string; url?: string }> {
  const res = await api.post(`/share-groups/${id}/images/${imageId}/download`);
  return res.data;
}

export async function getGroupDownloadsSummary(id: string): Promise<DownloadsSummary> {
  const res = await api.get(`/share-groups/${id}/downloads/summary`);
  return (res.data?.data ?? res.data) as DownloadsSummary;
}

export async function listGroupDownloads(id: string, limit: number = 20, offset: number = 0): Promise<{ data: DownloadRecord[]; totalCount: number }> {
  const res = await api.get(`/share-groups/${id}/downloads`, { params: { limit, offset } });
  const data = res.data;
  return {
    data: unwrapArray<DownloadRecord>(data),
    totalCount: data?.totalCount ?? data?.total ?? 0,
  };
}

export async function renameGroup(id: string, name: string): Promise<any> {
  const res = await api.put(`/share-groups/${id}`, { name });
  return res.data;
}

export async function deleteGroup(id: string): Promise<any> {
  const res = await api.delete(`/share-groups/${id}`);
  return res.data;
}

export async function removeGroupMember(id: string, memberId: string): Promise<any> {
  const res = await api.delete(`/share-groups/${id}/members/${memberId}`);
  return res.data;
}
