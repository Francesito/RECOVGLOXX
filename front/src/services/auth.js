// frontend/src/services/auth.js
import { API_BASE_URL } from '../config';

export const login = async (email, password) => {
  const response = await fetch(`${API_BASE_URL}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  return await response.json();
};