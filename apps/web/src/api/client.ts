import axios from "axios";

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE || "/",
  timeout: 60_000,
});

apiClient.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err?.response?.data?.detail) {
      err.message = err.response.data.detail;
    }
    return Promise.reject(err);
  },
);
