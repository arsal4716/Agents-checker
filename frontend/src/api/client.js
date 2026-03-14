import axios from "axios";

const api = axios.create({
  baseURL: "/api",
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const login = (username, password) =>
  api.post("/auth/login", { username, password }).then((r) => r.data);

export const logout = () =>
  api.post("/auth/logout").then((r) => r.data);

export const getMe = () =>
  api.get("/auth/me").then((r) => r.data);

// ─── Stats (admin, auth required) ────────────────────────────────────────────
export const getLatest = (type) =>
  api.get(`/stats/${type}/latest`).then((r) => r.data);

export const triggerRefresh = (type) =>
  api.post(`/stats/${type}/refresh`).then((r) => r.data);

export const getRecent = (type, limit = 20, state = "") =>
  api.get(`/stats/${type}/recent`, { params: { limit, ...(state && { state }) } }).then((r) => r.data);

export const getHourlyAverages = (type, days = 1, state = "") =>
  api.get(`/stats/${type}/hourly`, { params: { days, ...(state && { state }) } }).then((r) => r.data);

export const getDownloadUrl = (type) => `/api/stats/${type}/download`;

// ─── Public Publisher (no auth required) ──────────────────────────────────────
export const getPublisherLatest = () =>
  api.get("/public/publisher/latest").then((r) => r.data);

export const refreshPublisher = () =>
  api.post("/public/publisher/refresh").then((r) => r.data);

export const getPublisherRecent = (limit = 20, state = "") =>
  api.get("/public/publisher/recent", { params: { limit, ...(state && { state }) } }).then((r) => r.data);

export const getPublisherHourly = (days = 1, state = "") =>
  api.get("/public/publisher/hourly", { params: { days, ...(state && { state }) } }).then((r) => r.data);

export const getPublisherDownloadUrl = () => `/api/public/publisher/download`;

export default api;
