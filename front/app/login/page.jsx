'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useUser } from '../UserContext';
import Template from '../template';
import { API_BASE_URL } from '../../src/config'; // Importamos la URL base

export default function LoginPage() {
  const { setUser, isInitialized } = useUser();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (isInitialized) {
      setIsLoading(false);
    }
  }, [isInitialized]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/login`, { // Usamos API_BASE_URL
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        credentials: 'include', // Mantener cookies si el backend usa sesiones
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Error al iniciar sesión');
      }

      const userData = data.user;
      setUser(userData);
      localStorage.setItem('user', JSON.stringify(userData)); // Guardamos el usuario en localStorage
      window.dispatchEvent(new Event('custom-storage-update')); // Disparamos evento personalizado
      router.push('/dashboard');
    } catch (err) {
      setError(err.message);
      console.error('Login error:', err);
    }
  };

  if (isLoading) {
    return (
      <Template>
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-neonCyan"></div>
        </div>
      </Template>
    );
  }

  return (
    <Template>
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-dark-bg to-gray-900">
        <div className="bg-darkBg p-8 rounded-lg shadow-xl w-full max-w-md border border-neonCyan/30">
          <h2 className="text-3xl font-bold text-center text-cyan-300 mb-6">Iniciar Sesión</h2>
          
          {error && (
            <div className="mb-4 p-3 bg-red-900/50 text-red-300 rounded-lg">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-gray-400 mb-2">Correo Electrónico</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-3 bg-gray-800 text-white rounded-lg border border-gray-700 focus:outline-none focus:border-neonCyan"
                required
              />
            </div>

            <div>
              <label className="block text-gray-400 mb-2">Contraseña</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-3 bg-gray-800 text-white rounded-lg border border-gray-700 focus:outline-none focus:border-neonCyan"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full bg-neonCyan text-dark-bg py-3 rounded-lg font-semibold hover:bg-cyan-400 transition-all duration-300"
              disabled={!isInitialized}
            >
              {isInitialized ? 'Iniciar Sesión' : 'Cargando...'}
            </button>
          </form>

          <p className="text-gray-400 text-center mt-4">
            ¿No tienes una cuenta?{' '}
            <Link href="/register" className="text-neonCyan hover:underline">
              Regístrate aquí
            </Link>
          </p>
        </div>
      </div>
    </Template>
  );
}