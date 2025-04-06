// app/register/page.jsx
'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import '../../styles/globalStyles.css';
import { API_BASE_URL } from '../../src/config';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [userType, setUserType] = useState('basic');
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    console.log('handleSubmit - Starting execution');
    setError('');

    console.log('handleSubmit - Form Data:', { email, password, name, userType });

    if (!email || !password || !name || !userType) {
      console.log('handleSubmit - Validation failed: Missing fields');
      setError('Por favor, completa todos los campos requeridos (nombre, correo, contraseña y tipo de usuario).');
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
          nombre: name,
          userType,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Error al registrar el usuario.');
      }

      const userData = {
        uid: data.uid,
        userType,
        email,
        nombre: name,
        createdAt: new Date().toISOString(),
      };

      console.log('handleSubmit - User Data to Save:', userData);
      localStorage.setItem('user', JSON.stringify(userData));
      console.log('handleSubmit - Dispatching custom-storage-update');
      window.dispatchEvent(new Event('custom-storage-update'));

      router.push('/');
    } catch (err) {
      console.error('handleSubmit - Error:', err.message);
      setError(err.message || 'Ocurrió un error inesperado.');
    }
  }, [email, password, name, userType, router]);

  return (
    <div className="min-h-screen flex flex-col relative background-pattern">
      <main className="flex-grow">
        <div className="container mx-auto py-16 px-6 relative min-h-screen z-10 flex items-center justify-center">
          <div className="flex flex-col items-center justify-center gap-8 w-full max-w-6xl md:flex-row">
            <div className="w-full max-w-md flex flex-col items-center space-y-8">
              <div className="relative w-full h-48 sm:h-64 md:h-[300px] rounded-2xl overflow-hidden">
                <video autoPlay loop muted className="absolute top-0 left-0 w-full h-full object-cover mix-blend-multiply bg-transparent">
                  <source src="./videos/BACKGROUND.webm" type="video/webm" />
                  Tu navegador no soporta el elemento de video.
                </video>
              </div>
              <div className="text-center">
                <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-cyan-300 mb-4">RECOVGLOX</h1>
                <p className="text-base sm:text-lg md:text-xl text-gray-300 max-w-xl mx-auto">
                  Una solución avanzada para la rehabilitación de manos. Monitorea tu progreso, mejora tu movilidad y recupera tu fuerza con tecnología de punta.
                </p>
              </div>
            </div>
            <div className="w-full max-w-md flex justify-center">
              <div className="w-full bg-cardBg backdrop-blur-md p-6 sm:p-8 rounded-2xl shadow-2xl border border-gray-700">
                <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-cyan-300 text-center mb-6">Registrarse</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Nombre"
                    required
                    className="input-field text-sm sm:text-base"
                  />
                  <select
                    value={userType}
                    onChange={(e) => setUserType(e.target.value)}
                    className="input-field text-sm sm:text-base"
                  >
                    <option value="basic">Usuario Básico</option>
                    <option value="physio">Fisioterapeuta</option>
                  </select>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Correo"
                    required
                    className="input-field text-sm sm:text-base"
                  />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Contraseña"
                    required
                    className="input-field text-sm sm:text-base"
                  />
                  <button type="submit" className="button-primary text-sm sm:text-base">
                    Registrarse
                  </button>
                </form>
                <p className="text-center mt-4 text-gray-300 text-sm sm:text-base">
                  ¿Ya tienes cuenta?{' '}
                  <a href="/" className="text-cyan-400 hover:text-cyan-300 transition-all">
                    Inicia sesión
                  </a>
                </p>
                {error && <p className="text-center text-red-500 mt-4 text-sm sm:text-base">{error}</p>}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}