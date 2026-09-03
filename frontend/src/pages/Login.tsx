
import { FormEvent, useState } from 'react';
import { LockKeyhole, Mail } from 'lucide-react';

import { api } from '../lib/api';
import { Button } from '../components/ui/Button';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setError('');
    setLoading(true);

    try {
      const response = await api.post('/auth/login', {
        email,
        password,
      });

      const { accessToken, user } = response.data;

      /*
       * Store authentication data.
       *
       * If your backend uses httpOnly cookies instead,
       * remove this and let the API handle the session.
       */
      localStorage.setItem('accessToken', accessToken);

      if (user) {
        localStorage.setItem('user', JSON.stringify(user));
      }

      // Redirect after successful login
      window.location.href = '/';
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          'Invalid email or password.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* Mobile Brand */}
      <div className="mb-8 flex items-center gap-3 lg:hidden">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-sm font-bold text-white">
          IT
        </div>

        <div>
          <p className="text-sm font-semibold text-slate-900">
            IT Management
          </p>

          <p className="text-xs text-slate-500">
            Administration Portal
          </p>
        </div>
      </div>

      {/* Heading */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Welcome back
        </h1>

        <p className="mt-2 text-sm text-slate-500">
          Sign in to access your IT Management account.
        </p>
      </div>

      {/* Login Form */}
      <form
        onSubmit={handleSubmit}
        className="space-y-5"
      >
        {/* Email */}
        <div>
          <label
            htmlFor="email"
            className="mb-1.5 block text-sm font-medium text-slate-700"
          >
            Email address
          </label>

          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@company.com"
              autoComplete="email"
              required
              className="h-11 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
            />
          </div>
        </div>

        {/* Password */}
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label
              htmlFor="password"
              className="block text-sm font-medium text-slate-700"
            >
              Password
            </label>

            <button
              type="button"
              className="text-xs font-medium text-slate-600 hover:text-slate-900"
              onClick={() => {
                // TODO: Forgot password flow
              }}
            >
              Forgot password?
            </button>
          </div>

          <div className="relative">
            <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

            <input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter your password"
              autoComplete="current-password"
              required
              className="h-11 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
            />
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-lg border border-red-100 bg-red-50 px-3 py-2.5 text-sm text-red-600">
            {error}
          </div>
        )}

        {/* Submit */}
        <Button
          type="submit"
          disabled={loading}
          className="h-11 w-full justify-center"
        >
          {loading ? 'Signing in...' : 'Sign in'}
        </Button>
      </form>

      {/* Security Message */}
      <div className="mt-8 border-t border-slate-100 pt-5">
        <p className="text-center text-xs leading-5 text-slate-400">
          Your account access is protected by secure authentication.
          Contact your system administrator if you need assistance.
        </p>
      </div>
    </div>
  );
}

