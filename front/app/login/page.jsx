'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function Login({ setUser }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const router = useRouter();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(null);

    try {
      const response = await fetch('http://localhost:3001/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Error al iniciar sesión.');
      }

      // Guardar los datos del usuario en localStorage y actualizar el estado
      const userData = data.user;
      localStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);
      router.push('/');
    } catch (err) {
      setError(err.message);
      console.error('Error en login:', err);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-dark-bg to-gray-900">
      <div className="bg-darkBg p-8 rounded-lg shadow-xl w-full max-w-md border border-neonCyan/30">
        <h2 className="text-3xl font-bold text-center text-cyan-300 mb-6">Iniciar Sesión</h2>
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
          {error && <p className="text-red-500 text-center">{error}</p>}
          <button
            type="submit"
            className="w-full bg-neonCyan text-dark-bg py-3 rounded-lg font-semibold hover:bg-cyan-400 transition-all duration-300"
          >
            Iniciar Sesión
          </button>
        </form>
        <p className="text-gray-400 text-center mt-4">
          ¿No tienes una cuenta?{' '}
          <Link href="/register" className="text-neonCyan hover:underline">
            Regístrate
          </Link>
        </p>
      </div>
    </div>
  );
}