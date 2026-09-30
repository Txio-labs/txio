import axios from 'axios';
import { API_BASE } from '../services/api';

const apiClient = axios.create({
  baseURL: API_BASE,
  // Session is an HttpOnly cookie; the custom header is the CSRF check.
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'X-Requested-With': 'txio',
  },
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
