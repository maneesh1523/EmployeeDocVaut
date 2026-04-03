import { Navigate } from "react-router-dom";

export default function Login({ login, token }) {
  // Already logged in — go straight to dashboard
  if (token) return <Navigate to="/" replace />;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-blue-50 p-6">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">

        <div className="h-2 bg-blue-600 w-full" />

        <div className="p-8 pt-10 text-center">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl mx-auto mb-6 flex items-center justify-center shadow-lg shadow-blue-200">
            <span className="text-3xl">🛡️</span>
          </div>

          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight mb-2">
            Document Vault
          </h1>
          <p className="text-gray-500 mb-10 text-sm">
            Secure enterprise file management for HR and Employees.
            Please sign in to access your dashboard.
          </p>

          <button
            onClick={login}
            className="group relative w-full flex items-center justify-center gap-3 bg-gray-900 hover:bg-black text-white font-bold py-4 px-6 rounded-2xl transition-all duration-200 active:scale-95 shadow-lg shadow-gray-200"
          >
            <span>Login with Cognito</span>
            <svg
              className="w-5 h-5 transition-transform group-hover:translate-x-1"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </button>

          <div className="mt-10 pt-6 border-t border-gray-50 flex flex-col gap-2">
            <div className="flex justify-center gap-4 text-xs font-medium text-gray-400">
              <span className="hover:text-blue-600 cursor-pointer transition-colors">Privacy Policy</span>
              <span>•</span>
              <span className="hover:text-blue-600 cursor-pointer transition-colors">Security Standards</span>
            </div>
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 p-8 text-gray-300 text-xs font-mono pointer-events-none">
        v2.4.0-STABLE
      </div>
    </div>
  );
}