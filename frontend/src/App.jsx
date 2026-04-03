import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useAuth } from "./auth/useAuth";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import ProtectedRoute from "./components/ProtectedRoute";

export default function App() {
  const { token, loading, login, logout } = useAuth();

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={<Login login={login} token={token} />}
        />

        <Route
          path="/"
          element={
            <ProtectedRoute token={token} loading={loading}>
              <Dashboard token={token} logout={logout} />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}