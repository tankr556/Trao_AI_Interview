'use client';

import './globals.css';
import { ReactNode, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function RootLayout({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<{ name?: string; email?: string } | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
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
    setDropdownOpen(false);
    router.push('/login');
  };

  const getUserInitials = (name?: string, email?: string) => {
    if (name) {
      const parts = name.trim().split(' ');
      if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
      }
      return name.substring(0, 2).toUpperCase();
    }
    if (email) {
      return email.substring(0, 2).toUpperCase();
    }
    return 'U';
  };

  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-900 text-slate-100 antialiased selection:bg-indigo-500 selection:text-white">
        <header className="border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-md sticky top-0 z-50 shadow-lg shadow-black/20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
            {/* Left: Brand Logo & Navigation */}
            <div className="flex items-center gap-8">
              <Link href="/" className="flex items-center gap-2.5 group">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-500 flex items-center justify-center font-black text-white text-lg shadow-md shadow-indigo-500/25 group-hover:scale-105 transition-transform">
                  T
                </div>
                <span className="font-bold text-xl tracking-tight text-white group-hover:text-indigo-300 transition-colors">
                  Trao <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">AI Prep Kit</span>
                </span>
              </Link>

              {user && (
                <nav className="hidden md:flex items-center gap-1 text-sm font-medium text-slate-300">
                  <Link 
                    href="/" 
                    className="px-3 py-1.5 rounded-lg hover:bg-slate-800/60 hover:text-white transition-colors"
                  >
                    Dashboard
                  </Link>
                </nav>
              )}
            </div>
            
            {/* Right: User Profile & Actions */}
            <div className="flex items-center gap-4">
              {user ? (
                <div className="relative">
                  <button
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    className="flex items-center gap-3 p-1.5 pl-3 rounded-full bg-slate-900/80 hover:bg-slate-800/80 border border-slate-700/60 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <div className="flex flex-col text-right hidden sm:block">
                      <span className="text-xs font-bold text-slate-200 max-w-[140px] truncate leading-tight">
                        {user.name || user.email || 'User'}
                      </span>
                    </div>

                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white shadow-sm ring-2 ring-indigo-500/30">
                      {getUserInitials(user.name, user.email)}
                    </div>
                  </button>

                  {/* Dropdown Menu */}
                  {dropdownOpen && (
                    <>
                      <div 
                        className="fixed inset-0 z-10" 
                        onClick={() => setDropdownOpen(false)}
                      />
                      <div className="absolute right-0 mt-2 w-56 bg-slate-950 border border-slate-800 rounded-xl shadow-2xl p-2 z-20 space-y-1 backdrop-blur-lg">
                        <div className="px-3 py-2 border-b border-slate-800/80 mb-1">
                          <p className="text-xs font-bold text-slate-200">{user.name || 'Account'}</p>
                          <p className="text-[11px] text-slate-400 truncate">{user.email}</p>
                        </div>
                        <button
                          onClick={handleLogout}
                          className="w-full text-left px-3 py-2 rounded-lg text-xs font-semibold text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition-colors flex items-center gap-2"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                          </svg>
                          Logout
                        </button>
                      </div>
                    </>
                  )}
              ) : null}
            </div>
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          {children}
        </main>
      </body>
    </html>
  );
}

