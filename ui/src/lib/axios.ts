import axios from "axios";

// Create axios instance with base configuration

const baseURL = import.meta.env.VITE_DELIVARY_API_URL || "";
const token = import.meta.env.VITE_DELIVARY_API_TOKEN || "";

if (!baseURL || !token) {
  console.error(
    "Missing required environment variables VITE_DELIVARY_API_TOKEN or VITE_DELIVARY_API_URL"
  );
}

const axiosInstance = axios.create({
  baseURL,
  timeout: 5000, // 5 seconds timeout
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  },
});

// Request interceptor for additional request handling
axiosInstance.interceptors.request.use(
  (config) => {
    // Add any additional request handling here
    console.log("Making request to:", config.url);
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
axiosInstance.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Handle common errors here
    if (error.response?.status === 401) {
      console.error("Unauthorized request");
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
