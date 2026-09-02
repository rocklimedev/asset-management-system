import axios from 'axios';

export const api = axios.create({ baseURL: '/api' });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('itam_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('itam_token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  },
);

// Small helper so callers get a clean message instead of a raw axios error.
export function apiErrorMessage(err: unknown, fallback = 'Something went wrong. Please try again.') {
  if (axios.isAxiosError(err)) {
    return err.response?.data?.message ?? fallback;
  }
  return fallback;
}
