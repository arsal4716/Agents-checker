import { logout } from "../api/client";
import { useAuth } from "../hooks/useAuth.jsx";
import { useNavigate } from "react-router-dom";

export default function Navbar({ lastChecked, autoRefreshSecs }) {
  const { setUser } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      setUser(null);
      navigate("/login");
    }
  };

  return (
    <header className="border-b border-surface-border bg-surface/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-md bg-accent-green flex items-center justify-center shrink-0">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0d0f14" strokeWidth="2.5">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
            </svg>
          </div>
          <span className="font-display text-sm text-white tracking-widest uppercase">CRM Monitor</span>
        </div>

        {/* Right */}
        <div className="flex items-center gap-4">
          {lastChecked && (
            <div className="hidden sm:flex items-center gap-2 text-xs text-gray-500">
              <span className="w-1.5 h-1.5 rounded-full bg-accent-green animate-pulse2 inline-block" />
              <span className="font-display">Auto-refresh in {autoRefreshSecs}s</span>
            </div>
          )}
          <button onClick={handleLogout} className="btn-danger py-1.5 px-3 text-xs">
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}
