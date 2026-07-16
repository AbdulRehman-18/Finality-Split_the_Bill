"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";

export default function LoginPage() {
  const router = useRouter();
  const { user, login, signup, loading } = useAuth();
  
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // If already logged in, redirect to home
  useEffect(() => {
    if (!loading && user) {
      router.push("/");
    }
  }, [user, loading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    if (!username.trim() || !password.trim()) {
      setError("Please fill in all fields.");
      setSubmitting(false);
      return;
    }

    if (!isLogin && !displayName.trim()) {
      setError("Please enter a display name.");
      setSubmitting(false);
      return;
    }

    try {
      if (isLogin) {
        const res = await login(username, password);
        if (res.success) {
          router.push("/");
        } else {
          setError(res.error || "Authentication failed.");
        }
      } else {
        const res = await signup(username, displayName, password);
        if (res.success) {
          router.push("/");
        } else {
          setError(res.error || "Account creation failed.");
        }
      }
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="font-mono text-sm text-muted animate-pulse">
          INITIALIZING GATEWAY...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col justify-between">
      {/* Header */}
      <header className="border-b border-border px-4 sm:px-6 py-3 flex items-center justify-between bg-panel">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-orange animate-pulse" />
          <h1 className="font-mono text-sm font-bold tracking-widest uppercase">
            Ledger Watch
          </h1>
          <span className="pill pill-overdue">SECURE GATEWAY</span>
        </div>
        <span className="label-caps hidden sm:inline">OFFLINE MODE</span>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="panel p-6 sm:p-8 relative overflow-hidden bg-panel">
            {/* Terminal Top Accent */}
            <div className="absolute top-0 left-0 w-full h-1 bg-ink opacity-30" />
            
            <div className="flex items-center justify-between mb-6">
              <h2 className="label-caps text-xs">
                {isLogin ? "IDENTITY AUTHENTICATION" : "IDENTITY CREATION"}
              </h2>
              <span className="font-mono text-[9px] text-muted">
                {isLogin ? "SEC_LEVEL_2" : "SEC_LEVEL_1"}
              </span>
            </div>

            <p className="font-mono text-2xl font-bold mb-6 tracking-tight">
              {isLogin ? "Log In to Ledger" : "Create Operator Account"}
            </p>

            {error && (
              <div className="panel border-red/40 bg-red/5 p-3 mb-6 text-red font-mono text-xs leading-relaxed flex items-start gap-2">
                <span className="flex-shrink-0 mt-0.5">✕</span>
                <div>
                  <span className="font-bold uppercase tracking-wider block mb-0.5">SYS_ERROR</span>
                  {error}
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label-caps block mb-1">Username / Operator Handle</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. satoshi"
                  className="w-full panel border border-border px-3 py-2 font-mono text-sm outline-none focus:border-ink"
                  required
                />
              </div>

              {!isLogin && (
                <div>
                  <label className="label-caps block mb-1">Display Name</label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="e.g. Satoshi Nakamoto"
                    className="w-full panel border border-border px-3 py-2 font-mono text-sm outline-none focus:border-ink"
                    required={!isLogin}
                  />
                </div>
              )}

              <div>
                <label className="label-caps block mb-1">Access Cipher (Password)</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full panel border border-border px-3 py-2 font-mono text-sm outline-none focus:border-ink"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-ink text-panel font-mono text-sm font-semibold tracking-wider uppercase py-3 px-6 rounded hover:opacity-90 transition-opacity disabled:opacity-50 mt-2 cursor-pointer"
              >
                {submitting
                  ? (isLogin ? "AUTHENTICATING..." : "CREATING IDENTITY...")
                  : (isLogin ? "Access Operations" : "Initialize Identity")}
              </button>
            </form>

            <div className="mt-6 border-t border-border/60 pt-4 text-center">
              <button
                type="button"
                onClick={() => {
                  setIsLogin(!isLogin);
                  setError("");
                }}
                className="font-mono text-xs text-blue hover:underline cursor-pointer"
              >
                {isLogin
                  ? "Need a new account? Register identity"
                  : "Already registered? Verify access cipher"}
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border px-4 sm:px-6 py-3 flex items-center justify-between bg-panel">
        <span className="label-caps">GATEWAY SHIELD V1.1</span>
        <span className="label-caps">ALL CHANNELS ENCRYPTED</span>
      </footer>
    </div>
  );
}
