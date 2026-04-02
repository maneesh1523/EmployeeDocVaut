export const getFiles = (client) => {
  return client.get("/files");
};

export const uploadMeta = (client, data) => {
  return client.post("/upload", data);
};

export const getDownloadUrl = (client, id) => {
  return client.get(`/download/${id}`);
};

export const deleteFile = (client, id) => {
  return client.delete(`/files/${id}`);
};