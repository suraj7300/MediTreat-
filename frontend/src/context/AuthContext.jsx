import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api';

const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem('meditreat_user');
    if (saved) setUser(JSON.parse(saved));
    setLoading(false);
  }, []);

  async function login(email, password) {
    const data = await api.login({ email, password });
    localStorage.setItem('meditreat_token', data.token);
    localStorage.setItem('meditreat_user', JSON.stringify(data.user));
    setUser(data.user);
    return data;
  }

  function logout() {
    localStorage.removeItem('meditreat_token');
    localStorage.removeItem('meditreat_user');
    setUser(null);
  }

  return (
    <AuthCtx.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthCtx.Provider>
  );
}
