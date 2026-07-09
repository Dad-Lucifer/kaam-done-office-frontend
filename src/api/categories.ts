import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const categoryClient = axios.create({
  baseURL: `${API_BASE}/api/categories`,
  headers: { 'Content-Type': 'application/json' },
});

categoryClient.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Category {
  categoryId: string;
  adminUserId: string;
  name: string;
  createdAt: string;
}

// ─── API Calls ────────────────────────────────────────────────────────────────

/**
 * Fetch all workspace categories for the authenticated admin (sorted by createdAt).
 */
export async function fetchCategories(): Promise<Category[]> {
  const { data } = await categoryClient.get('/');
  return data.data || [];
}

/**
 * Create a new workspace category.
 */
export async function createCategory(name: string): Promise<Category> {
  const { data } = await categoryClient.post('/', { name });
  return data.data;
}

/**
 * Delete a category and cascade-delete all its text/voice channels.
 */
export async function deleteCategory(categoryId: string): Promise<void> {
  await categoryClient.delete(`/${categoryId}`);
}
