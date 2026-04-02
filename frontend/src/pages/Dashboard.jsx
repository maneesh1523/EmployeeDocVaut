import { useEffect, useState, useCallback, useMemo } from "react";
import { createClient } from "../api/client";
import {
  getFiles,
  uploadMeta,
  getDownloadUrl,
  deleteFile,
} from "../api/documents";
import Navbar from "../components/Navbar";
import Loader from "../components/Loader";
import { parseJwt } from "../utils/jwt";

export default function Dashboard({ token, logout }) {
  const client = useMemo(() => createClient(token), [token]);
  const user = useMemo(() => {
    if (!token) return null;
    const decoded = parseJwt(token);
    return {
      id: decoded.sub,
      email: decoded.email,
      groups: decoded["cognito:groups"] || [] 
    };
  }, [token]);

  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({ type: "", file: null });

  const loadFiles = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getFiles(client);
      setFiles(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Fetch error:", err);
      setFiles([]);
    } finally {
      setLoading(false);
    }
  }, [client]);

  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!form.file || !form.type) return;

    setUploading(true);
    try {
      const cleanName = form.file.name.replace(/\s+/g, "_");
      
      const res = await uploadMeta(client, {
        document_type: form.type,
        filename: cleanName
      });

      const { upload_url } = res.data;

      // FIXED: Hardcoded to match Lambda signature
      const uploadRes = await fetch(upload_url, {
        method: "PUT",
        body: form.file,
        headers: { 
          "Content-Type": "application/octet-stream" 
        }
      });

      if (!uploadRes.ok) throw new Error("S3 Upload Failed");

      setForm({ type: "", file: null });
      await loadFiles();
    } catch (err) {
      alert("Upload failed. Ensure S3 CORS allows 'Content-Type' header.");
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (id) => {
    try {
      const res = await getDownloadUrl(client, id);
      window.open(res.data.download_url, "_blank");
    } catch (err) {
      console.error("Download error", err);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this document?")) return;
    try {
      await deleteFile(client, id);
      setFiles(prev => prev.filter(f => f.document_id !== id));
    } catch (err) {
      console.error("Delete error", err);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <Navbar user={user} logout={logout} />

      <main className="max-w-6xl mx-auto p-6">
        <header className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-800">Document Vault</h1>
            <p className="text-sm text-gray-500 mt-1">
              Role: <span className="font-bold text-blue-600">{user?.groups[0] || "User"}</span>
            </p>
          </div>
        </header>

        {/* Upload Form */}
        <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 mb-8 transition-all hover:shadow-md">
          <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">New Upload</h2>
          <form onSubmit={handleUpload} className="flex flex-wrap gap-4 items-end">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-gray-600 ml-1">Document Type</label>
              <input
                type="text"
                placeholder="e.g. Contract"
                value={form.type}
                required
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="border border-gray-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none w-64 bg-gray-50"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-gray-600 ml-1">File</label>
              <input
                type="file"
                required
                onChange={(e) => setForm({ ...form, file: e.target.files[0] })}
                className="text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
              />
            </div>
            <button
              disabled={uploading || !form.file}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white px-8 py-2.5 rounded-xl font-bold transition-all shadow-lg active:scale-95 ml-auto"
            >
              {uploading ? "Uploading..." : "Upload File"}
            </button>
          </form>
        </section>

        {/* Files Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="grid grid-cols-5 bg-gray-50/50 px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest border-b">
            <span>Name</span>
            <span>Category</span>
            <span>Owner (Email)</span>
            <span>Date</span>
            <span className="text-right">Actions</span>
          </div>

          <div className="divide-y divide-gray-100">
            {loading ? (
              <div className="p-20 flex justify-center"><Loader /></div>
            ) : files.length === 0 ? (
              <div className="p-20 text-center text-gray-400 italic">No records found.</div>
            ) : (
              files.map((f) => (
                <div key={f.document_id} className="grid grid-cols-5 px-6 py-5 text-sm items-center hover:bg-blue-50/10 transition-colors">
                  <div className="font-semibold text-gray-800 flex items-center gap-3">
                    <span className="text-xl">📄</span>
                    <span className="truncate w-32" title={f.filename}>{f.filename}</span>
                  </div>
                  
                  <div>
                    <span className="bg-gray-100 text-gray-600 text-[10px] px-2 py-1 rounded-md font-bold uppercase tracking-tighter">
                      {f.document_type}
                    </span>
                  </div>

                  {/* DISPLAY EMAIL HERE */}
                  <div className="flex flex-col">
                    <span className="text-gray-700 font-medium truncate w-40">
                      {f.employee_email || "No Email Provided"}
                    </span>
                    <span className="text-[10px] text-gray-400 font-mono">
                      ID: {f.employee_id?.substring(0, 8)}...
                    </span>
                  </div>
                  
                  <span className="text-gray-400">
                    {f.upload_timestamp ? new Date(f.upload_timestamp).toLocaleDateString() : "—"}
                  </span>

                  <div className="flex justify-end gap-5">
                    <button 
                      onClick={() => handleDownload(f.document_id)} 
                      className="text-blue-600 hover:text-blue-800 font-bold"
                    >
                      View
                    </button>
                    <button 
                      onClick={() => handleDelete(f.document_id)} 
                      className="text-red-400 hover:text-red-600 font-bold"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
}