// src/main.tsx
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom"; // 1. Import BrowserRouter
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"; // 2. Import React Query components
import { ToastContainer } from "react-toastify"; // 3. Import ToastContainer
import "react-toastify/dist/ReactToastify.css"; // 4. Import React Toastify CSS

import App from "./App"; // Your main App component

// Create a client for React Query
const queryClient = new QueryClient();

// Get the root element from your public/index.html
ReactDOM.createRoot(document.getElementById("root")!).render(
  <>
    {/* 1. BrowserRouter wraps the entire app to enable routing */}
    <BrowserRouter>
      {/* 2. QueryClientProvider makes React Query available throughout the app */}
      <QueryClientProvider client={queryClient}>
        {/* Your main application component */}
        <App />
        {/* 3. ToastContainer renders all toast notifications */}
        <ToastContainer />
      </QueryClientProvider>
    </BrowserRouter>
  </>
);
