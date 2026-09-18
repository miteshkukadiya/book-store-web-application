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

// Response interceptor for handling 401 unauthenticated
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      const message = error.response.data?.message;
      if (message && message.toLowerCase().includes("token expired")) {
        localStorage.removeItem("token");
        localStorage.removeItem("id");
        localStorage.removeItem("role");
      }
    }
    return Promise.reject(error);
  }
);

export default api;
