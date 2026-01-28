// src/main.tsx
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ToastContainer from "./components/common/ToastContainer";

import App from "./App";

// Create a client for React Query
const queryClient = new QueryClient();

// Get the root element from your public/index.html
ReactDOM.createRoot(document.getElementById("root")!).render(
  <>
    {/* BrowserRouter wraps the entire app to enable routing */}
    <BrowserRouter>
      {/* QueryClientProvider makes React Query available throughout the app */}
      <QueryClientProvider client={queryClient}>
        {/* Your main application component */}
        <App />
        {/* Custom ToastContainer renders all toast notifications */}
        <ToastContainer />
      </QueryClientProvider>
    </BrowserRouter>
  </>
);
