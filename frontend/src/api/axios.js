import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:1000/api/v1",
});

// Automatically attach auth headers if token exists
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    const id = localStorage.getItem("id");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    if (id) {
      config.headers.id = id;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for handling invalid or expired authentication tokens
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      const message = error.response.data?.message?.toLowerCase() || "";
      const tokenIsInvalid =
        message.includes("token invalid or expired") ||
        message.includes("token expired");

      if (tokenIsInvalid && localStorage.getItem("token")) {
        localStorage.removeItem("token");
        localStorage.removeItem("id");
        localStorage.removeItem("role");

        if (window.location.pathname !== "/LogIn") {
          window.location.assign("/LogIn");
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
