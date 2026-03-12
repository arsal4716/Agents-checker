import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login } from "../api/client";
import { useAuth } from "../hooks/useAuth.jsx";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { setUser } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await login(username, password);
      setUser(data);
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.error || "Login failed. Check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden">
      {/* Background grid */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(rgba(0,229,160,0.5) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,229,160,0.5) 1px, transparent 1px)`,
          backgroundSize: "40px 40px",
        }}
      />

      {/* Glow */}
      <div className="absolute w-96 h-96 rounded-full bg-accent-green opacity-5 blur-[100px] -translate-x-1/2 -translate-y-1/2 top-1/2 left-1/2 pointer-events-none" />

      <div className="relative w-full max-w-sm animate-fade-in">
        {/* Logo / Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-accent-green flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0d0f14" strokeWidth="2.5">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
              </svg>
            </div>
            <span className="font-display text-lg text-white tracking-widest uppercase">CRM Monitor</span>
          </div>
          <p className="text-gray-500 text-sm">Agent Availability Dashboard</p>
        </div>

        {/* Card */}
        <div className="card p-8">
          <h1 className="text-xl font-semibold text-white mb-1">Admin Login</h1>
          <p className="text-gray-500 text-sm mb-6">Enter your credentials to continue</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wider">
                Email
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin@example.com"
                required
                className="w-full bg-surface border border-surface-border rounded-lg px-3 py-2.5 text-white text-sm
                           placeholder:text-gray-600 focus:outline-none focus:border-accent-green
                           transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wider">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full bg-surface border border-surface-border rounded-lg px-3 py-2.5 text-white text-sm
                           placeholder:text-gray-600 focus:outline-none focus:border-accent-green
                           transition-colors"
              />
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2.5 text-red-400 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary py-2.5 flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-surface/40 border-t-surface rounded-full animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-gray-600 text-xs mt-4">
          HLG Solutions · CRM Agent Monitor
        </p>
      </div>
    </div>
  );
}
