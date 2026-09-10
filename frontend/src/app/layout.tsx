'use client';

import './globals.css';
import { ReactNode, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function RootLayout({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<{ name?: string; email?: string } | null>(null);
  const router = useRouter();

  useEffect(() => {
    // Check auth state in localStorage
    const storedUser = localStorage.getItem('trao_user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        setUser(null);
      }
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('trao_token');
    localStorage.removeItem('trao_user');
    setUser(null);
    router.push('/login');
  };

  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-900 text-slate-100 antialiased">
        <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-500/30">
                T
              </div>
              <a href="/" className="font-bold text-xl tracking-tight text-white hover:text-indigo-300 transition-colors">
                Trao <span className="text-xs font-semibold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">AI Prep Kit</span>
              </a>
            </div>
            
            <nav className="flex items-center gap-4 text-sm font-medium">
              {user && (
                <>
                  <a href="/" className="text-slate-400 hover:text-white transition-colors">Dashboard</a>
                  <div className="flex items-center gap-3">
                    <span className="text-xs px-2.5 py-1 rounded-full bg-slate-800 text-indigo-300 border border-slate-700 font-semibold">
                      👤 {user.name || user.email}
                    </span>
                    <button
                      onClick={handleLogout}
                      className="px-3 py-1.5 rounded-lg bg-rose-600/20 text-rose-300 border border-rose-500/30 font-semibold hover:bg-rose-600 hover:text-white transition-colors text-xs"
                    >
                      Logout
                    </button>
                  </div>
                </>
              )}
            </nav>
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-4 py-8">
          {children}
        </main>
      </body>
    </html>
  );
}
