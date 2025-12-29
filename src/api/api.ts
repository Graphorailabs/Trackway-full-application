
import axios from "axios";

const baseURL = "https://srv1213622.hstgr.cloud/api/v1";

export const api = axios.create({
  baseURL,
  headers: {
    "Content-Type": "application/json",
  },
});


