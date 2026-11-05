import React, { useState } from 'react';
import { useApp } from '../context/AppContext';

export const LoginPage: React.FC = () => {
  const { login } = useApp();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await login(username, password);
      if (!res.success) {
        setError(res.error || 'Invalid username or password.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row font-['Inter',sans-serif] bg-[#f1f6f9] text-[#172b38]">
      {/* Brand Panel matching original Valhala Games design */}
      <aside className="w-full md:w-[36%] min-h-[240px] md:min-h-screen flex flex-col items-center justify-center p-8 text-center text-white bg-[radial-gradient(ellipse_at_bottom,#15534f_0%,transparent_60%),linear-gradient(145deg,#071a21,#0c3437_70%,#071a21)]">
        <div className="text-[#45c6a5] text-6xl leading-none mb-4" aria-hidden="true">
          ⚔
        </div>
        <div className="text-3xl md:text-5xl font-extrabold tracking-[5px]">
          VALHALA
        </div>
        <div className="mt-1 text-[#45c6a5] text-lg md:text-xl font-bold tracking-[8px]">
          GAMES
        </div>
        <p className="mt-6 text-[#d8e7e7] text-base md:text-lg">
          Play. Compete. Win.
        </p>

        <div className="mt-8 text-xs text-[#a0c5bd] max-w-[240px] leading-relaxed">
          Financial register & arcade transaction terminal powered by MySQL.
        </div>
      </aside>

      {/* Main Login Panel */}
      <main className="flex-1 flex flex-col items-center justify-center p-6 md:p-10">
        <section className="w-full max-w-[500px] p-8 md:p-11 border border-white/80 rounded-[18px] bg-white/90 shadow-[0_20px_60px_rgba(22,48,65,0.09)] backdrop-blur-sm">
          <h1 className="text-2xl md:text-3xl font-bold text-center tracking-tight mb-2 text-[#172b38]">
            Welcome Back
          </h1>
          <p className="text-[#71869a] text-center text-sm mb-7 leading-relaxed">
            Sign in to access the Valhala Games terminal.
          </p>

          {error && (
            <div
              role="alert"
              className="mb-5 p-3 rounded-lg border border-[#f2c5c5] bg-[#fff1f1] text-[#a12b2b] text-sm"
            >
              ⚠ {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="mb-5">
              <label htmlFor="username" className="block mb-2 text-sm font-bold text-[#172b38]">
                Username
              </label>
              <input
                type="text"
                id="username"
                name="username"
                placeholder="Enter your username"
                autoComplete="username"
                value={username}
                onChange={e => setUsername(e.target.value)}
                required
                className="w-full p-3.5 border border-[#d7e1e9] rounded-[9px] outline-none bg-white text-[#172b38] focus:border-[#13796d] focus:ring-2 focus:ring-[#13796d]/15 transition-all text-sm"
              />
            </div>

            <div className="mb-6">
              <label htmlFor="password" className="block mb-2 text-sm font-bold text-[#172b38]">
                Password
              </label>
              <input
                type="password"
                id="password"
                name="password"
                placeholder="Enter your password"
                autoComplete="current-password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                className="w-full p-3.5 border border-[#d7e1e9] rounded-[9px] outline-none bg-white text-[#172b38] focus:border-[#13796d] focus:ring-2 focus:ring-[#13796d]/15 transition-all text-sm"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 px-6 border-none rounded-[9px] bg-gradient-to-r from-[#0b514b] to-[#13796d] text-white font-bold text-sm cursor-pointer hover:-translate-y-0.5 hover:opacity-95 transition-all shadow-md disabled:opacity-50"
            >
              {loading ? 'Signing in...' : 'Log In \u2192'}
            </button>
          </form>
        </section>
      </main>
    </div>
  );
};
