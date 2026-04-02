// src/components/ProtectedRoute.jsx
import { Navigate } from "react-router-dom";

export default function ProtectedRoute({ token, loading, children }) {
  if (loading) return <div className="p-4">Checking auth...</div>;

  if (!token) return <Navigate to="/login" />;

  return children;
}