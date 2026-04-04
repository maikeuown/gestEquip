import axios, { AxiosRequestConfig } from 'axios';

const instance = axios.create({
  baseURL: '/api/v1',
  headers: { 'Content-Type': 'application/json' },
});

instance.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('accessToken');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

instance.interceptors.response.use(
  (res) => res.data?.data ?? res.data,
  async (err) => {
    if (err.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      window.location.href = '/login';
    }
    return Promise.reject(err.response?.data || err);
  }
);

const api = {
  get: <T = any>(url: string, config?: AxiosRequestConfig) =>
    instance.get(url, config) as Promise<T>,
  post: <T = any>(url: string, data?: any, config?: AxiosRequestConfig) =>
    instance.post(url, data, config) as Promise<T>,
  put: <T = any>(url: string, data?: any, config?: AxiosRequestConfig) =>
    instance.put(url, data, config) as Promise<T>,
  patch: <T = any>(url: string, data?: any, config?: AxiosRequestConfig) =>
    instance.patch(url, data, config) as Promise<T>,
  delete: <T = any>(url: string, config?: AxiosRequestConfig) =>
    instance.delete(url, config) as Promise<T>,
};

export default api;
