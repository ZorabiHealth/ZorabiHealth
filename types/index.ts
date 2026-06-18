export interface ApiResponse<T = unknown> {
  data: T | null;
  error: string | null;
  message?: string;
}

export type AsyncStatus = "idle" | "loading" | "success" | "error";

export interface AsyncIdle {
  status: "idle";
}

export interface AsyncLoading {
  status: "loading";
}

export interface AsyncError {
  status: "error";
  message: string;
}

export interface AsyncSuccess<T> {
  status: "success";
  data: T;
}

export type AsyncState<T> = AsyncIdle | AsyncLoading | AsyncError | AsyncSuccess<T>;

export type UserRole = "patient" | "doctor" | "pharmacy_vendor";

export interface GeminiResponse {
  text: string | null;
  error: string | null;
}

export interface GeminiRequest {
  prompt: string;
}

export interface Notification {
  id: string;
  title: string;
  body: string;
  category: string;
  priority: string;
  data: Record<string, unknown>;
  created_at: string;
  read: boolean;
}
