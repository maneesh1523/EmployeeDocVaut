// src/api/client.js
import axios from "axios";

export const createClient = (token) => {
  const client = axios.create({
    baseURL: "https://yffozxd0bh.execute-api.ap-south-1.amazonaws.com/prod"
  });

  client.interceptors.request.use((config) => {
    config.headers.Authorization = `Bearer ${token}`;
    return config;
  });

  return client;
};