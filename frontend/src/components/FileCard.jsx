// src/components/FileCard.jsx
export default function FileCard({ file, onDownload, onDelete }) {
  return (
    <div className="border p-4 rounded flex justify-between">
      <div>
        <p className="font-bold">{file.document_type}</p>
        <p className="text-sm text-gray-500">{file.upload_timestamp}</p>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => onDownload(file.document_id)}
          className="bg-blue-500 text-white px-3 py-1 rounded"
        >
          Download
        </button>
        <button
          onClick={() => onDelete(file.document_id)}
          className="bg-red-500 text-white px-3 py-1 rounded"
        >
          Delete
        </button>
      </div>
    </div>
  );
}