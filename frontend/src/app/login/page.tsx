'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);

    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'https://trao-ai-interview.onrender.com/api';
    const endpoint = isRegister ? `${baseUrl}/auth/register` : `${baseUrl}/auth/login`;

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(isRegister ? { email, password, name } : { email, password })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || 'Authentication failed.');
      }

      if (isRegister) {
        // Upon Register -> Show success message and switch to Login view
        setSuccessMsg('Account registered successfully! Please sign in with your credentials.');
        setIsRegister(false);
        setPassword('');
      } else {
        // Upon Login -> Store token and redirect to Dashboard
        if (data.token) {
          localStorage.setItem('trao_token', data.token);
          localStorage.setItem('trao_user', JSON.stringify(data.user));
          window.location.href = '/';
        }
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto my-12 bg-slate-950/80 border border-slate-800 rounded-2xl p-8 shadow-2xl space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-extrabold text-white">
          {isRegister ? 'Create Account' : 'Welcome Back'}
        </h2>
        <p className="text-sm text-slate-400">
          {isRegister ? 'Sign up to manage your personalized interview kits' : 'Sign in to access your interview prep kits'}
        </p>
      </div>

      {successMsg && (
        <div className="p-3.5 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-emerald-300 text-sm font-semibold text-center">
          {successMsg}
        </div>
      )}

      {error && (
        <div className="p-3.5 bg-rose-500/20 border border-rose-500/40 rounded-xl text-rose-300 text-sm font-semibold text-center">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {isRegister && (
          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-1.5">Full Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="John Doe"
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              required
            />
          </div>
        )}

        <div>
          <label className="block text-sm font-semibold text-slate-300 mb-1.5">Email Address</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-300 mb-1.5">Password</label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-4 pr-12 py-3 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors p-1"
              title={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? '👁️' : '🙈'}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-base rounded-xl shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50"
        >
          {loading ? 'Authenticating...' : isRegister ? 'Register Account' : 'Sign In'}
        </button>
      </form>

      <div className="text-center">
        <button
          onClick={() => {
            setIsRegister(!isRegister);
            setError('');
            setSuccessMsg('');
          }}
          className="text-sm font-semibold text-indigo-400 hover:text-indigo-300 transition-colors"
        >
          {isRegister ? 'Already have an account? Sign In' : "Don't have an account? Register"}
        </button>
      </div>
    </div>
  );
}
