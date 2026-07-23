import axios from 'axios';
import { API_BASE } from '../services/api';

const apiClient = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token interceptor
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('txio_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Password rotation API call
export const updatePassword = async (data: {
  current_password: string;
  new_password: string;
  confirm_password: string;
}) => {
  return apiClient.post('/auth/update-password', data);
};

// ... rest of the API functions

export { apiClient };
