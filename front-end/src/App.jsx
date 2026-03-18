import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Navbar from "./Components/Navbar";
import Landing from "./Pages/Landing";
import Login from "./Pages/Login";
import Register from "./Pages/Register";
import Dashboard from "./Pages/Dashboard";
import History from "./Pages/History";
import VideoInput from "./Pages/VideoInput";
import { consumeSessionNotice } from "./lib/auth";

function App() {
  const [sessionNotice, setSessionNotice] = useState("");

  useEffect(() => {
    setSessionNotice(consumeSessionNotice() || "");

    const handleSessionExpired = () => {
      setSessionNotice(consumeSessionNotice() || "");
    };

    window.addEventListener("auth:session-expired", handleSessionExpired);
    return () => {
      window.removeEventListener("auth:session-expired", handleSessionExpired);
    };
  }, []);

  return (
    <BrowserRouter>
      <Navbar />
      {sessionNotice && (
        <div className="sticky top-[72px] z-40 mx-auto max-w-5xl px-4 pt-4 sm:px-6 lg:px-8">
          <div className="flex items-start justify-between gap-4 rounded-2xl border border-amber-200/30 bg-[rgba(74,45,10,0.92)] px-5 py-4 text-sm text-amber-50 shadow-[0_14px_40px_rgba(0,0,0,0.24)]">
            <p>{sessionNotice}</p>
            <button
              type="button"
              onClick={() => setSessionNotice("")}
              className="shrink-0 rounded-full border border-amber-100/20 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-amber-100/80"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/history" element={<History />} />
        <Route path="/video-input" element={<VideoInput />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
