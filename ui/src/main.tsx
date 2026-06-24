import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

// Create a client with optimized settings for auth
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
      retry: (failureCount, error) => {
        // Don't retry on network errors or auth errors
        if (error instanceof Error) {
          if (error.message.includes('timeout') || 
              error.message.includes('network') ||
              error.message.includes('auth')) {
            return false;
          }
        }
        return failureCount < 1; // Only retry once
      },
      retryDelay: 1000, // 1 second delay between retries
      refetchOnWindowFocus: false, // Prevent refetch on window focus
      refetchOnReconnect: true, // Refetch on reconnect
    },
    mutations: {
      retry: false, // Don't retry mutations
    },
  },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  </StrictMode>
);
