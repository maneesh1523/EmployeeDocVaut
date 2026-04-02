// src/components/Navbar.jsx
export default function Navbar({ user, logout }) {
  return (
    <div className="bg-gray-800 text-white p-4 flex justify-between">
      <span>HR Docs</span>
      <div className="flex gap-4">
        <span>{user?.email}</span>
        <button onClick={logout} className="bg-red-500 px-3 py-1 rounded">
          Logout
        </button>
      </div>
    </div>
  );
}