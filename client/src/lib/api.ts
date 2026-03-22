export const API_CONFIG = {
  backend:
    import.meta.env.VITE_API_BASE_URL ??
    (import.meta.env.DEV
      ? "http://localhost:5000"
      : "https://your-render-backend.onrender.com"),
};
