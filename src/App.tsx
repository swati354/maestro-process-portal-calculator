import { AuthProvider, useAuth } from '@/hooks/useAuth';

function SignInGate() {
  const { isAuthenticated, isLoading, login, error } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-gray-600">Loading…</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4">
        <h1 className="text-xl font-semibold">Sign in</h1>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="button"
          onClick={login}
          className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          Sign in with UiPath
        </button>
      </div>
    );
  }

  return (
    <main className="min-h-screen p-8">
      <h1 className="text-2xl font-semibold">UiPath Coded Web App</h1>
      <p className="mt-2 text-sm text-gray-600">
        Replace this placeholder with your application UI.
      </p>
    </main>
  );
}

export function App() {
  return (
    <AuthProvider>
      <SignInGate />
    </AuthProvider>
  );
}
