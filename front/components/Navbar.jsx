// components/Navbar.jsx
'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';
import { FaBars, FaTimes } from 'react-icons/fa';
import { signOut } from 'firebase/auth';
import { auth } from '../app/firebase';

export default function Navbar({
  user,
  setUser,
  resetAllStates,
  fetchPatients,
  fetchNotifications,
  fetchUserProgress,
  fetchUserObservations,
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const router = useRouter();

  // Manejo del scroll para el efecto de fondo
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Cerrar el menú móvil si la pantalla se agranda (mayor a 768px)
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleLogout = useCallback(async () => {
    console.log('Navbar - handleLogout - Starting logout process');
    try {
      await signOut(auth);
      console.log('Navbar - handleLogout - Sign out successful');
      localStorage.removeItem('user');
      setUser(null);
      if (typeof resetAllStates === 'function') {
        resetAllStates();
      }
      setMobileMenuOpen(false);
      router.push('/');
    } catch (err) {
      console.error('Navbar - handleLogout - Sign out error:', err.message);
      localStorage.removeItem('user');
      setUser(null);
      if (typeof resetAllStates === 'function') {
        resetAllStates();
      }
      setMobileMenuOpen(false);
      router.push('/');
    }
  }, [setUser, resetAllStates, router]);

  const handleReload = useCallback(async () => {
    console.log('Navbar - handleReload - Refreshing data');
    if (!user) return;
    try {
      if (user.userType === 'physio') {
        if (fetchPatients && fetchNotifications) {
          await fetchPatients(user.uid);
          await fetchNotifications(user.uid);
        }
      } else {
        if (fetchUserProgress && fetchUserObservations) {
          await fetchUserProgress(user.uid);
          await fetchUserObservations(user.email);
        }
      }
    } catch (err) {
      console.error('Navbar - handleReload - Error refreshing data:', err.message);
    }
  }, [user, fetchPatients, fetchNotifications, fetchUserProgress, fetchUserObservations]);

  const toggleMobileMenu = useCallback(() => {
    setMobileMenuOpen((prev) => !prev);
  }, []);

  return (
    <nav
      className={`bg-gradient-to-b from-dark-bg to-gray-900 py-4 text-center border-b border-neonCyan/30 shadow-lg fixed top-0 w-full z-50 transition-all duration-300 ${
        scrolled ? 'backdrop-blur-md bg-dark-bg/80' : ''
      }`}
    >
      <div className="container mx-auto px-4 flex flex-wrap justify-between items-center">
        {/* Logo con más espaciado */}
        <Link
          href="/"
          className="text-2xl md:text-3xl font-bold text-cyan-300 hover:text-cyan-400 transition-colors duration-300 tracking-wide mx-4"
        >
          RECOVGLOX
        </Link>

        {/* Menú para pantallas grandes */}
        <div className="hidden md:flex items-center space-x-4 flex-wrap">
          <Link
            href="/"
            className="text-gray-400 text-sm font-medium hover:text-neonCyan transition-all duration-300 px-3 py-2 rounded-lg hover:bg-gray-800"
          >
            Inicio
          </Link>
          <Link
            href="/sobre-nosotros"
            className="text-gray-400 text-sm font-medium hover:text-neonCyan transition-all duration-300 px-3 py-2 rounded-lg hover:bg-gray-800"
          >
            Sobre Nosotros
          </Link>
          <Link
            href="/sobre-producto"
            className="text-gray-400 text-sm font-medium hover:text-neonCyan transition-all duration-300 px-3 py-2 rounded-lg hover:bg-gray-800"
          >
            Sobre el Producto
          </Link>
          {user && (
            <div className="flex items-center space-x-4 flex-wrap">
              <span className="text-gray-400 text-sm truncate max-w-[200px]">{user.email}</span>
              <span className="text-gray-400 text-sm">
                ({user.userType === 'physio' ? 'Fisioterapeuta' : 'Básico'})
              </span>
              <button
                onClick={handleReload}
                className="bg-cyan-500 text-white hover:bg-cyan-600 transition-colors duration-300 px-3 py-2 rounded-lg text-sm font-semibold"
              >
                Recargar
              </button>
              <button
                onClick={handleLogout}
                className="bg-red-500 text-white hover:bg-red-600 transition-colors duration-300 px-3 py-2 rounded-lg text-sm font-semibold"
              >
                Cerrar Sesión
              </button>
            </div>
          )}
        </div>

        {/* Botón hamburguesa para móviles */}
        <div className="md:hidden">
          <button
            onClick={toggleMobileMenu}
            className="text-gray-400 hover:text-neonCyan transition-all duration-300 p-2 rounded-full hover:bg-gray-800"
          >
            {mobileMenuOpen ? <FaTimes size={20} /> : <FaBars size={20} />}
          </button>
        </div>
      </div>

      {/* Menú móvil */}
      {mobileMenuOpen && (
        <div
          className="md:hidden border-t border-neonCyan/30 py-4"
          style={{ backgroundColor: '#1a202c' }}
        >
          <div className="flex flex-col items-center space-y-4 px-4">
            <Link
              href="/"
              onClick={toggleMobileMenu}
              className="text-gray-400 text-sm font-medium hover:text-neonCyan transition-all duration-300 px-4 py-2 rounded-lg hover:bg-gray-800 w-full text-center"
            >
              Inicio
            </Link>
            <Link
              href="/sobre-nosotros"
              onClick={toggleMobileMenu}
              className="text-gray-400 text-sm font-medium hover:text-neonCyan transition-all duration-300 px-4 py-2 rounded-lg hover:bg-gray-800 w-full text-center"
            >
              Sobre Nosotros
            </Link>
            <Link
              href="/sobre-producto"
              onClick={toggleMobileMenu}
              className="text-gray-400 text-sm font-medium hover:text-neonCyan transition-all duration-300 px-4 py-2 rounded-lg hover:bg-gray-800 w-full text-center"
            >
              Sobre el Producto
            </Link>
            {user && (
              <div className="w-full px-4 pt-4 border-t border-neonCyan/30 flex flex-col space-y-4">
                <p className="text-gray-400 text-sm text-center truncate">{user.email}</p>
                <p className="text-gray-400 text-sm text-center">
                  ({user.userType === 'physio' ? 'Fisioterapeuta' : 'Básico'})
                </p>
                <button
                  onClick={handleReload}
                  className="bg-cyan-500 text-white hover:bg-cyan-600 transition-colors duration-300 px-4 py-2 rounded-lg text-sm font-semibold w-full"
                >
                  Recargar
                </button>
                <button
                  onClick={handleLogout}
                  className="bg-red-500 text-white hover:bg-red-600 transition-colors duration-300 px-4 py-2 rounded-lg text-sm font-semibold w-full"
                >
                  Cerrar Sesión
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}