import axios, { AxiosError } from "axios";
import { authService } from "@/services/auth-service";

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/api/v1",
  withCredentials: true,
  headers: {
    "Content-Type": "application/json"
  }
});

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as (typeof error.config & { _retry?: boolean }) | undefined;

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        await authService.refresh();
        return api(originalRequest);
      } catch {
        await authService.logout();
      }
    }

    if (error.response?.status === 401) {
      if (typeof window !== "undefined" && window.location.pathname !== "/login") {
        window.location.assign("/login");
      }
    }

    return Promise.reject(error);
  }
);
