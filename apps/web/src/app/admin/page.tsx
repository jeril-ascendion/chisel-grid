import { auth, signOut } from '@/auth';
import { redirect } from 'next/navigation';

export default async function AdminDashboard() {
  const session = await auth();
  if (!session?.user) redirect('/login');

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <h1 className="text-xl font-bold text-gray-900">
            ChiselGrid Admin
          </h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">
              {session.user.email} ({session.user.role})
            </span>
            <form
              action={async () => {
                'use server';
                await signOut({ redirectTo: '/' });
              }}
            >
              <button
                type="submit"
                className="rounded-md bg-gray-200 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-300"
              >
                Sign Out
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8">
        <p className="text-gray-600">
          Welcome to ChiselGrid. Dashboard content coming in EPIC-07.
        </p>
      </main>
    </div>
  );
}
