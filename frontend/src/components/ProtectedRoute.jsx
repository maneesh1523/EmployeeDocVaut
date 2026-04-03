import { Navigate } from "react-router-dom";
import Loader from "./Loader";

export default function ProtectedRoute({ token, loading, children }) {
  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-gray-50">
        <Loader />
      </div>
    );
  }

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return children;
}