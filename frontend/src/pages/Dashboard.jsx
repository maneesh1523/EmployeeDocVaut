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
  
  // NAVIGATION STATE: Tracks which Owner's folder is open
  const [selectedOwner, setSelectedOwner] = useState("All Owners");

  // 1. Identify all unique owners (emails) from the document list
  const owners = useMemo(() => {
    const uniqueEmails = new Set(files.map(f => f.employee_email).filter(Boolean));
    return ["All Owners", ...Array.from(uniqueEmails)];
  }, [files]);

  // 2. Filter files to only show those belonging to the selected owner
  const displayedFiles = useMemo(() => {
    if (selectedOwner === "All Owners") return files;
    return files.filter(f => f.employee_email === selectedOwner);
  }, [files, selectedOwner]);

  const loadFiles = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getFiles(client);
      setFiles(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Fetch error:", err);
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
      const res = await uploadMeta(client, { document_type: form.type, filename: cleanName });
      const { upload_url } = res.data;
      const uploadRes = await fetch(upload_url, {
        method: "PUT",
        body: form.file,
        headers: { "Content-Type": "application/octet-stream" }
      });
      if (!uploadRes.ok) throw new Error("S3 Upload Failed");
      setForm({ type: "", file: null });
      await loadFiles();
    } catch (err) {
      alert("Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (id) => {
    const res = await getDownloadUrl(client, id);
    window.open(res.data.download_url, "_blank");
  };

  const handleDelete = async (id) => {
    if (!confirm("Remove this file from the vault?")) return;
    await deleteFile(client, id);
    setFiles(prev => prev.filter(f => f.document_id !== id));
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 flex flex-col">
      <Navbar user={user} logout={logout} />

      <div className="flex-1 max-w-7xl w-full mx-auto flex overflow-hidden">
        
        {/* SIDEBAR: OWNER FOLDERS */}
        <aside className="w-80 border-r border-gray-200 p-6 bg-white overflow-y-auto">
          <header className="mb-8">
            <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
              Storage Locations
            </h2>
            <p className="text-xs text-gray-500">Select an owner to view their private vault.</p>
          </header>
          
          <nav className="space-y-2">
            {owners.map((owner) => (
              <button
                key={owner}
                onClick={() => setSelectedOwner(owner)}
                className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl text-sm font-bold transition-all group ${
                  selectedOwner === owner
                    ? "bg-blue-600 text-white shadow-xl shadow-blue-100"
                    : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                }`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl shadow-sm transition-colors ${
                  selectedOwner === owner ? "bg-white/20" : "bg-blue-50 text-blue-600"
                }`}>
                  {owner === "All Owners" ? "🌐" : "👤"}
                </div>
                <div className="flex flex-col items-start overflow-hidden">
                  <span className="truncate w-full text-left">{owner}</span>
                  {owner !== "All Owners" && (
                    <span className={`text-[10px] font-medium ${selectedOwner === owner ? "text-blue-100" : "text-gray-400"}`}>
                      Personal Folder
                    </span>
                  )}
                </div>
              </button>
            ))}
          </nav>
        </aside>

        {/* MAIN VAULT AREA */}
        <main className="flex-1 p-8 overflow-y-auto">
          <div className="max-w-4xl mx-auto">
            
            <header className="mb-10">
              <div className="flex items-center gap-2 text-xs font-bold text-blue-600 uppercase tracking-tight mb-2">
                <span>Vault</span>
                <span className="text-gray-300">/</span>
                <span>{selectedOwner}</span>
              </div>
              <h1 className="text-4xl font-black tracking-tight text-gray-900">
                {selectedOwner === "All Owners" ? "Global Archive" : "User Repository"}
              </h1>
            </header>

            {/* Upload Section */}
            <section className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100 mb-10 transition-all hover:shadow-md">
              <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-6">Deposit New Document</h3>
              <form onSubmit={handleUpload} className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-700 ml-1">Document Type</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Identity"
                    className="w-full bg-gray-50 border-none rounded-2xl px-5 py-3.5 focus:ring-2 focus:ring-blue-500 transition-all"
                    value={form.type}
                    onChange={(e) => setForm({...form, type: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-700 ml-1">Select File</label>
                  <input
                    type="file"
                    required
                    className="block w-full text-sm text-gray-400
                      file:mr-4 file:py-2.5 file:px-4
                      file:rounded-xl file:border-0
                      file:text-xs file:font-black
                      file:bg-blue-50 file:text-blue-700
                      hover:file:bg-blue-100 transition-all"
                    onChange={(e) => setForm({...form, file: e.target.files[0]})}
                  />
                </div>
                <button
                  disabled={uploading}
                  className="bg-gray-900 text-white font-black py-4 rounded-2xl hover:bg-black disabled:bg-gray-200 transition-all shadow-lg active:scale-95"
                >
                  {uploading ? "Securing File..." : "Upload to Vault"}
                </button>
              </form>
            </section>

            {/* File Repository */}
            <div className="grid gap-4">
              {loading ? (
                <Loader />
              ) : displayedFiles.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-[2rem] border-2 border-dashed border-gray-100">
                  <div className="text-4xl mb-4 text-gray-200">🔍</div>
                  <p className="text-gray-400 font-bold">No documents found in this owner's folder.</p>
                </div>
              ) : (
                displayedFiles.map((file) => (
                  <div 
                    key={file.document_id} 
                    className="bg-white p-6 rounded-[1.5rem] border border-gray-100 flex items-center justify-between group hover:border-blue-200 hover:shadow-xl hover:shadow-blue-50/50 transition-all"
                  >
                    <div className="flex items-center gap-5">
                      <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center text-2xl group-hover:bg-blue-600 group-hover:text-white transition-all duration-300">
                        📄
                      </div>
                      <div>
                        <h4 className="font-black text-gray-900 text-lg leading-tight mb-1">{file.filename}</h4>
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] font-black uppercase tracking-tighter text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                            {file.document_type}
                          </span>
                          <span className="text-[10px] text-gray-400 font-bold">
                            Uploaded {new Date(file.upload_timestamp).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={() => handleDownload(file.document_id)}
                        className="px-6 py-2.5 text-sm font-black text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                      >
                        Download
                      </button>
                      <button 
                        onClick={() => handleDelete(file.document_id)}
                        className="p-3 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}