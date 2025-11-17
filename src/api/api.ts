
import axios from "axios";

const baseURL = "https://api2.advven.com/api/v1";

export const api = axios.create({
  baseURL,
  headers: {
    "Content-Type": "application/json",
  },
});


