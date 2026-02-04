// src/App.tsx
import React, { useEffect } from "react";
import { Routes, Route, useNavigate } from "react-router-dom";
import useAppStore from "./store/useAppStore";
import CreateMeetingScreen from "./screens/CreateMeetingScreen";
import JoinMeetingScreen from "./screens/JoinMeetingScreen";
import VideoCallScreen from "./screens/VideoCallScreen";
import "./index.css";

function App() {
  const callActive = useAppStore((state) => state.callActive);
  const navigate = useNavigate();
  const theme = useAppStore((state) => state.theme);

  useEffect(() => {
    document.documentElement.classList.remove("light", "dark");
    document.documentElement.classList.add(theme);
  }, [theme]);

  useEffect(() => {
    // When call ends, redirect away from call screen back to home
    if (!callActive && window.location.pathname.startsWith("/call")) {
      navigate("/");
    }
  }, [callActive, navigate]);

  return (
    // UPDATED: Using direct Tailwind default colors for primary background/text
    <div className="flex flex-col min-h-screen bg-gray-100 dark:bg-gray-900 font-inter text-gray-900 dark:text-white transition-colors duration-300">
      <div className="absolute top-4 right-4">{/* <ThemeSwitcher /> */}</div>

      <Routes>
        <Route path="/" element={<CreateMeetingScreen />} />
        <Route path="/join" element={<JoinMeetingScreen />} />
        <Route path="/call/:channelId" element={<VideoCallScreen />} />
        <Route
          path="*"
          element={
            // Using direct Tailwind default colors for 404 text
            <div className="flex items-center justify-center flex-1 text-2xl font-bold text-red-600 dark:text-red-400">
              404 Not Found
            </div>
          }
        />
      </Routes>
    </div>
  );
}

export default App;
