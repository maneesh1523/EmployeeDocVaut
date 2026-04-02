// src/pages/Login.jsx
import { useAuth } from "../auth/useAuth";

export default function Login() {
  const { login } = useAuth();

  return (
    <div className="h-screen flex justify-center items-center bg-gray-100">
      <button
        onClick={login}
        className="bg-blue-500 text-white px-6 py-3 rounded"
      >
        Login with Cognito
      </button>
    </div>
  );
}