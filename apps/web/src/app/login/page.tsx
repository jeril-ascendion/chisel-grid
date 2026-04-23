import { LoginForm } from './login-form';
import { AuthRedirect } from './auth-redirect';

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="w-full max-w-md space-y-8 rounded-xl bg-white dark:bg-gray-800 p-8 shadow-lg border border-transparent dark:border-gray-700">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">ChiselGrid</h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Sign in to Ascendion Engineering
          </p>
        </div>

        <AuthRedirect />
        <LoginForm />
      </div>
    </div>
  );
}
