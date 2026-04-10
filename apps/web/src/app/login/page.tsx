import { LoginForm } from './login-form';
import { AuthRedirect } from './auth-redirect';

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

        <AuthRedirect />
        <LoginForm />
      </div>
    </div>
  );
}
