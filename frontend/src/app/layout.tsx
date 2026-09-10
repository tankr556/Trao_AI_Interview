import './globals.css';
import { ReactNode } from 'react';

export const metadata = {
  title: 'Trao — AI Interview Prep Kit Builder',
  description: 'Turn any job description and company site into a personalized interview prep kit.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-900 text-slate-100 antialiased">
        <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-500/30">
                T
              </div>
              <span className="font-bold text-xl tracking-tight text-white">Trao <span className="text-xs font-semibold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">AI Prep Kit</span></span>
            </div>
            <nav className="flex items-center gap-4 text-sm font-medium text-slate-400">
              <a href="/" className="hover:text-white transition-colors">Dashboard</a>
              <a href="/login" className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-500 transition-colors">Login / Register</a>
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
