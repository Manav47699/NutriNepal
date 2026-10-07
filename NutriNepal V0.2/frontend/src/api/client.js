import axios from 'axios';
import { getTokens, setTokens, clearTokens, clearUser } from '../utils/tokenStorage';

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
});

let isRefreshing = false;
let failedQueue = [];
let authLogoutHandler = null;

export const setAuthLogoutHandler = (handler) => {
  authLogoutHandler = handler;
};

export const triggerHardLogout = () => {
  clearTokens();
  clearUser();
  if (authLogoutHandler) {
    authLogoutHandler();
  }
};

const processQueue = (error, token = null) => {
  failedQueue.forEach((promise) => {
    if (error) {
      promise.reject(error);
    } else {
      promise.resolve(token);
    }
  });
  failedQueue = [];
};

// Attach access token to outgoing requests
apiClient.interceptors.request.use(
  (config) => {
    const { access } = getTokens();
    const requestUrl = config.url || '';
    const isAuthEndpoint =
      requestUrl.includes('/api/accounts/login/') ||
      requestUrl.includes('/api/accounts/register/') ||
      requestUrl.includes('/api/token/refresh/');

    if (access && !isAuthEndpoint) {
      config.headers.Authorization = `Bearer ${access}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: automatically refresh expired access tokens on 401
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (!error.response || error.response.status !== 401 || !originalRequest) {
      return Promise.reject(error);
    }

    const requestUrl = originalRequest.url || '';
    const isAuthEndpoint =
      requestUrl.includes('/api/token/refresh/') ||
      requestUrl.includes('/api/accounts/login/') ||
      requestUrl.includes('/api/accounts/register/');

    if (isAuthEndpoint || originalRequest._retry) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      })
        .then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return apiClient(originalRequest);
        })
        .catch((err) => Promise.reject(err));
    }

    originalRequest._retry = true;
    isRefreshing = true;

    const { refresh } = getTokens();

    if (!refresh) {
      processQueue(error, null);
      isRefreshing = false;
      triggerHardLogout();
      return Promise.reject(error);
    }

    try {
      // Use plain axios instance to avoid recursion through interceptors
      const response = await axios.post(`${API_BASE_URL}/api/token/refresh/`, {
        refresh,
      });

      const newAccess = response.data?.access;
      if (!newAccess) {
        throw new Error('No access token returned from refresh endpoint');
      }

      setTokens({ access: newAccess });
      apiClient.defaults.headers.common.Authorization = `Bearer ${newAccess}`;
      originalRequest.headers.Authorization = `Bearer ${newAccess}`;

      processQueue(null, newAccess);
      return apiClient(originalRequest);
    } catch (refreshError) {
      processQueue(refreshError, null);
      triggerHardLogout();
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

export default apiClient;
