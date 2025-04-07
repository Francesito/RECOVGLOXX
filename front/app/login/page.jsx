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
      <main className="flex-grow flex items-center justify-center">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col lg:flex-row items-center justify-center gap-8 w-full">
            {/* Sección izquierda - Video y título (igual que en registro) */}
            <div className="w-full lg:w-1/2 flex flex-col items-center lg:items-start space-y-8">
              <div className="relative w-full max-w-lg h-64 md:h-80 lg:h-96 rounded-2xl overflow-hidden">
                <video 
                  autoPlay 
                  loop 
                  muted 
                  className="absolute top-0 left-0 w-full h-full object-cover mix-blend-multiply bg-transparent"
                >
                  <source src="./videos/BACKGROUND.webm" type="video/webm" />
                  Tu navegador no soporta el elemento de video.
                </video>
              </div>
              <div className="text-center lg:text-left">
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-cyan-300 mb-4">RECOVGLOX</h1>
                <p className="text-lg md:text-xl text-gray-300 max-w-lg">
                  Una solución avanzada para la rehabilitación de manos. Monitorea tu progreso, mejora tu movilidad y recupera tu fuerza con tecnología de punta.
                </p>
              </div>
            </div>

            {/* Sección derecha - Formulario (igual que en registro) */}
            <div className="w-full lg:w-1/2 flex justify-center">
              <div className="w-full max-w-md bg-cardBg backdrop-blur-md p-8 rounded-2xl shadow-2xl border border-gray-700">
                <h2 className="text-2xl md:text-3xl font-bold text-cyan-300 text-center mb-6">Iniciar Sesión</h2>
                
                {error && (
                  <div className="mb-4 p-3 bg-red-900/50 text-red-300 rounded-lg text-sm">
                    {error}
                  </div>
                )}

                <form onSubmit={handleLogin} className="space-y-6">
                  <div>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Correo electrónico"
                      required
                      className="input-field w-full"
                    />
                  </div>
                  <div>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Contraseña"
                      required
                      className="input-field w-full"
                    />
                  </div>
                  <button
                    type="submit"
                    className="button-primary w-full"
                    disabled={!isInitialized}
                  >
                    {isInitialized ? 'Iniciar Sesión' : 'Cargando...'}
                  </button>
                </form>

                <div className="mt-6 text-center">
                  <p className="text-gray-300">
                    ¿No tienes cuenta?{' '}
                    <Link 
                      href="/register" 
                      className="text-cyan-400 hover:text-cyan-300 transition-colors font-medium"
                    >
                      Regístrate aquí
                    </Link>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}