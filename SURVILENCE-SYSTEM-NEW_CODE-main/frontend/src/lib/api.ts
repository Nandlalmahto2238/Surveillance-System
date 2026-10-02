import axios from 'axios';

export const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  (typeof window !== 'undefined' && window.location.hostname
    ? `http://${window.location.hostname}:8000/api/v1`
    : 'http://localhost:8000/api/v1');

export const WS_BASE_URL =
  import.meta.env.VITE_WS_URL ||
  (typeof window !== 'undefined' && window.location.hostname
    ? `ws://${window.location.hostname}:8000/api/v1/ws`
    : 'ws://localhost:8000/api/v1/ws');

export const MEDIA_BASE_URL =
  import.meta.env.VITE_MEDIA_BASE_URL ||
  (typeof window !== 'undefined' && window.location.hostname
    ? `http://${window.location.hostname}:8000`
    : 'http://localhost:8000');

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  // Optional: add tenant ID header if multi-tenant UI is needed later
  config.headers['X-Tenant-ID'] = 'bb398bec-8429-44db-b9ec-b04c3ac81c36'; // Default Organization ID from seed
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // If unauthorized, redirect to login
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      // Only redirect if not already on the login page
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);
