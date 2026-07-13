import axios from "axios";

const API_URL = "http://localhost:8080";

export async function loginRequest(data) {
    const response = await axios.post(`${API_URL}/api/auth/login`, data);
    return response.data;
}