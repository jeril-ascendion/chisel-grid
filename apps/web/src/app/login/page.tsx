import { signIn } from '@/auth';

export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; callbackUrl?: string }>;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md space-y-8 rounded-xl bg-white p-8 shadow-lg">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">ChiselGrid</h1>
          <p className="mt-2 text-sm text-gray-600">
            Sign in to Ascendion Engineering
          </p>
        </div>

        <LoginForm searchParams={searchParams} />
      </div>
    </div>
  );
}

async function LoginForm({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; callbackUrl?: string }>;
}) {
  const params = await searchParams;
  const error = params.error;
  const callbackUrl = params.callbackUrl ?? '/admin';

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

      <form
        action={async () => {
          'use server';
          await signIn('cognito', { redirectTo: callbackUrl });
        }}
      >
        <button
          type="submit"
          className="w-full rounded-md bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Sign in with Ascendion SSO
        </button>
      </form>
    </div>
  );
}
