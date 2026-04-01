import React, { useState } from "react";

const UploadDocument = () => {
  const [file, setFile] = useState(null);
  const [employeeId, setEmployeeId] = useState("");
  const [documentType, setDocumentType] = useState("");
  const [message, setMessage] = useState("");

  const API_URL = "https://yffozxd0bh.execute-api.ap-south-1.amazonaws.com/prod/upload"; 

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleUpload = async () => {
    try {
      const token = localStorage.getItem("idToken");

      if (!token) {
        setMessage("❌ User not logged in. Token missing.");
        return;
      }

      if (!file) {
        setMessage("❌ Please select a file");
        return;
      }

      // 🔹 Step 1: Get presigned URL
      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}` // ✅ using stored token
        },
        body: JSON.stringify({
          employee_id: employeeId,
          document_type: documentType,
          filename: file.name
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to get upload URL");
      }

      const uploadUrl = data.upload_url;

      // 🔹 Step 2: Upload file to S3
      const uploadResponse = await fetch(uploadUrl, {
        method: "PUT",
        body: file
      });

      if (!uploadResponse.ok) {
        throw new Error("File upload failed");
      }

      setMessage("✅ File uploaded successfully!");
    } catch (error) {
      console.error(error);
      setMessage("❌ Error: " + error.message);
    }
  };

  return (
    <div style={{ padding: "20px" }}>
      <h2>Upload Document</h2>

      <input
        type="text"
        placeholder="Employee ID"
        value={employeeId}
        onChange={(e) => setEmployeeId(e.target.value)}
      />
      <br /><br />

      <input
        type="text"
        placeholder="Document Type"
        value={documentType}
        onChange={(e) => setDocumentType(e.target.value)}
      />
      <br /><br />

      <input type="file" onChange={handleFileChange} />
      <br /><br />

      <button onClick={handleUpload}>Upload</button>

      <p>{message}</p>
    </div>
  );
};

export default UploadDocument;