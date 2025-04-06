// app/login/page.jsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useUser } from '../UserContext';
import { API_BASE_URL } from '../../src/config';
import '../../styles/globalStyles.css';

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
      const response = await fetch(`${API_BASE_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        credentials: 'include',
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Error al iniciar sesión');
      }

      const userData = data.user;
      setUser(userData);
      localStorage.setItem('user', JSON.stringify(userData));
      window.dispatchEvent(new Event('custom-storage-update'));
      router.push('/dashboard');
    } catch (err) {
      setError(err.message);
      console.error('Login error:', err);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-neonCyan"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col relative background-pattern">
      <main className="flex-grow pt-20">
        <div className="container mx-auto py-6 px-4 sm:px-6 lg:px-8 min-h-screen flex items-center justify-center">
          <div className="flex flex-col md:flex-row items-center justify-center gap-8 w-full max-w-6xl">
            {/* Sección del video y descripción */}
            <div className="w-full md:w-1/2 flex flex-col items-center space-y-6">
              <div className="relative w-full h-48 sm:h-64 md:h-[400px] rounded-2xl overflow-hidden">
                <video autoPlay loop muted className="absolute top-0 left-0 w-full h-full object-cover mix-blend-multiply bg-transparent">
                  <source src="./videos/BACKGROUND.webm" type="video/webm" />
                  Tu navegador no soporta el elemento de video.
                </video>
              </div>
              <div className="text-center">
                <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-cyan-300 mb-4">RECOVGLOX</h1>
                <p className="text-base sm:text-lg md:text-xl text-gray-300 max-w-md mx-auto">
                  Una solución avanzada para la rehabilitación de manos. Monitorea tu progreso y mejora tu movilidad.
                </p>
              </div>
            </div>
            {/* Sección del formulario */}
            <div className="w-full md:w-1/2 flex justify-center">
              <div className="w-full max-w-md bg-cardBg backdrop-blur-md p-6 sm:p-8 rounded-2xl shadow-2xl border border-gray-700">
                <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-cyan-300 text-center mb-6">Iniciar Sesión</h2>
                {error && (
                  <div className="mb-4 p-3 bg-red-900/50 text-red-300 rounded-lg text-sm sm:text-base">
                    {error}
                  </div>
                )}
                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <label className="block text-gray-400 mb-2 text-sm sm:text-base">Correo Electrónico</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="input-field text-sm sm:text-base"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-gray-400 mb-2 text-sm sm:text-base">Contraseña</label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="input-field text-sm sm:text-base"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    className="button-primary text-sm sm:text-base"
                    disabled={!isInitialized}
                  >
                    {isInitialized ? 'Iniciar Sesión' : 'Cargando...'}
                  </button>
                </form>
                <p className="text-gray-400 text-center mt-4 text-sm sm:text-base">
                  ¿No tienes una cuenta?{' '}
                  <Link href="/register" className="text-cyan-400 hover:text-cyan-300 transition-all">
                    Regístrate aquí
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}