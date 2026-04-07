'use client';

import { useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { Suspense } from 'react';

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md space-y-8 rounded-xl bg-white p-8 shadow-lg">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">ChiselGrid</h1>
          <p className="mt-2 text-sm text-gray-600">
            Sign in to Ascendion Engineering
          </p>
        </div>

        <Suspense>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}

function LoginForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const error = searchParams.get('error');
  const callbackUrl = searchParams.get('callbackUrl') ?? '/admin/';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSSOClick() {
    // Redirect to Cognito SSO via NextAuth endpoint
    window.location.href = `/api/auth/signin/cognito?callbackUrl=${encodeURIComponent(callbackUrl)}`;
  }

  async function handleCredentialsSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError('');
    setLoading(true);

    try {
      const result = await signIn('cognito-credentials', {
        username: email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setFormError('Invalid email or password.');
      } else if (result?.ok) {
        router.push(callbackUrl);
      }
    } catch {
      setFormError('Sign in failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">
          {error === 'OAuthSignin'
            ? 'Could not start sign in flow. Please try again.'
            : error === 'OAuthCallback'
              ? 'Authentication failed. Please try again.'
              : 'An error occurred during sign in.'}
        </div>
      )}

      <button
        type="button"
        onClick={handleSSOClick}
        className="w-full rounded-md bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      >
        Sign in with Ascendion SSO
      </button>

      <form onSubmit={handleCredentialsSubmit} className="space-y-4">
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="bg-white px-2 text-gray-500">
              Or sign in with email
            </span>
          </div>
        </div>

        {formError && (
          <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
            {formError}
          </div>
        )}

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="you@ascendion.com"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700">
            Password
          </label>
          <input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-gray-800 px-4 py-3 text-sm font-semibold text-white hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50"
        >
          {loading ? 'Signing in...' : 'Sign In'}
        </button>

        <p className="text-center text-xs text-gray-500">
          For Ascendion employees, use Sign in with Ascendion SSO above
        </p>
      </form>
    </div>
  );
}
