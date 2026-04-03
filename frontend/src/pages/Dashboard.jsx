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
  
  // 1. Enhanced User Object with Group Logic
  const user = useMemo(() => {
    if (!token) return null;
    const decoded = parseJwt(token);
    const groups = decoded["cognito:groups"] || [];
    
    // Determine primary role for UI logic
    const isHR = groups.includes("HR_Admin");
    const isManager = groups.includes("Manager");
    const isEmployee = groups.includes("Employee");

    return {
      id: decoded.sub,
      email: decoded.email,
      groups: groups,
      role: isHR ? "HR Admin" : isManager ? "Manager" : "Employee",
      isAdminOrManager: isHR || isManager
    };
  }, [token]);

  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({ type: "", file: null });
  
  // NAVIGATION STATE
  const [selectedOwner, setSelectedOwner] = useState("All Records");

  // 2. Generate Folders based on Owners
  const owners = useMemo(() => {
    const uniqueEmails = new Set(files.map(f => f.employee_email).filter(Boolean));
    return ["All Records", ...Array.from(uniqueEmails)];
  }, [files]);

  // 3. Filter files by the selected owner
  const displayedFiles = useMemo(() => {
    if (selectedOwner === "All Records") return files;
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
    if (!confirm("Remove this file?")) return;
    await deleteFile(client, id);
    setFiles(prev => prev.filter(f => f.document_id !== id));
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 flex flex-col">
      <Navbar user={user} logout={logout} />

      <div className="flex-1 max-w-7xl w-full mx-auto flex overflow-hidden">
        
        {/* SIDEBAR: ROLE-BASED FOLDERS */}
        <aside className="w-80 border-r border-gray-200 p-6 bg-white overflow-y-auto">
          <header className="mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-[10px] font-black uppercase tracking-widest mb-4 border border-blue-100">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-600"></span>
              </span>
              {user?.role} Mode
            </div>
            <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">
              {user?.isAdminOrManager ? "Employee Vaults" : "My Storage"}
            </h2>
          </header>
          
          <nav className="space-y-2">
            {owners.map((owner) => (
              <button
                key={owner}
                onClick={() => setSelectedOwner(owner)}
                className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl text-sm font-bold transition-all group ${
                  selectedOwner === owner
                    ? "bg-gray-900 text-white shadow-xl shadow-gray-200"
                    : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                }`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl shadow-sm transition-colors ${
                  selectedOwner === owner ? "bg-white/10" : "bg-blue-50 text-blue-600"
                }`}>
                  {owner === "All Records" ? "📂" : "👤"}
                </div>
                <div className="flex flex-col items-start overflow-hidden">
                  <span className="truncate w-full text-left">
                    {owner === user?.email ? "My Folder (Self)" : owner}
                  </span>
                  <span className={`text-[9px] font-medium uppercase tracking-tighter ${selectedOwner === owner ? "text-gray-400" : "text-gray-400"}`}>
                    {owner === "All Records" ? "System View" : "Encrypted Vault"}
                  </span>
                </div>
              </button>
            ))}
          </nav>
        </aside>

        {/* MAIN VAULT AREA */}
        <main className="flex-1 p-8 overflow-y-auto">
          <div className="max-w-4xl mx-auto">
            
            <header className="mb-10 flex justify-between items-start">
              <div>
                <div className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-tight mb-2">
                  <span>Repository</span>
                  <span className="text-gray-300">/</span>
                  <span className="text-blue-600">{selectedOwner}</span>
                </div>
                <h1 className="text-4xl font-black tracking-tight text-gray-900">
                  {selectedOwner === "All Records" ? "Master Archive" : "Owner Details"}
                </h1>
              </div>

              {/* Status Badge */}
              <div className="hidden lg:block text-right">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Active Identity</p>
                <p className="text-sm font-bold text-gray-700">{user?.email}</p>
              </div>
            </header>

            {/* Upload Section - Styled specifically for security */}
            <section className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 mb-10 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <svg className="w-32 h-32" fill="currentColor" viewBox="0 0 20 20"><path d="M5.5 13a3.5 3.5 0 01-.369-6.98 4 4 0 117.753-1.977A4.5 4.5 0 1113.5 13H11V9.413l1.293 1.293a1 1 0 001.414-1.414l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13H5.5z" /><path d="M9 13h2v5a1 1 0 11-2 0v-5z" /></svg>
              </div>

              <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-6">Deposit New Document</h3>
              <form onSubmit={handleUpload} className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end relative z-10">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-600 ml-1">Document Category</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Contract"
                    className="w-full bg-gray-50 border-none rounded-2xl px-5 py-3.5 focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-gray-300"
                    value={form.type}
                    onChange={(e) => setForm({...form, type: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-600 ml-1">Choose File</label>
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
                  className="bg-blue-600 text-white font-black py-4 rounded-2xl hover:bg-blue-700 disabled:bg-gray-200 transition-all shadow-xl shadow-blue-100 active:scale-95"
                >
                  {uploading ? "Encrypting..." : "Upload to Vault"}
                </button>
              </form>
            </section>

            {/* List Section */}
            <div className="grid gap-3">
              {loading ? (
                <Loader />
              ) : displayedFiles.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-[2.5rem] border-2 border-dashed border-gray-100">
                  <p className="text-gray-300 font-bold">No assets found in this folder.</p>
                </div>
              ) : (
                displayedFiles.map((file) => (
                  <div 
                    key={file.document_id} 
                    className="bg-white p-5 rounded-3xl border border-gray-100 flex items-center justify-between group hover:border-blue-200 transition-all"
                  >
                    <div className="flex items-center gap-5">
                      <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center text-xl group-hover:bg-blue-600 group-hover:text-white transition-all duration-300 shadow-inner">
                        📄
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-900 mb-0.5">{file.filename}</h4>
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] font-black uppercase text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                            {file.document_type}
                          </span>
                          <span className="text-[10px] text-gray-400 font-medium">
                             {file.employee_email} • {new Date(file.upload_timestamp).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <button 
                        onClick={() => handleDownload(file.document_id)}
                        className="text-sm font-bold text-blue-600 hover:text-blue-800 transition-colors"
                      >
                        Download
                      </button>
                      {/* Delete logic - maybe hide if not HR? */}
                      <button 
                        onClick={() => handleDelete(file.document_id)}
                        className="p-2 text-gray-200 hover:text-red-500 transition-all"
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