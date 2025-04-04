// components/Navbar.jsx
'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';
import { FaBars, FaTimes } from 'react-icons/fa';
import { signOut } from 'firebase/auth';
import { auth } from '../app/firebase';

export default function Navbar({ user, setUser, resetAllStates }) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
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
        setMobileMenuOpen(false); // Cierra el menú móvil en pantallas grandes
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize(); // Ejecuta al montar para establecer el estado inicial
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleLogout = useCallback(async () => {
    console.log('Navbar - handleLogout - Starting logout process');
    try {
      console.log('Navbar - handleLogout - Calling signOut');
      await signOut(auth);
      console.log('Navbar - handleLogout - Sign out successful');
      console.log('Navbar - handleLogout - Current Firebase user:', auth.currentUser);
      localStorage.removeItem('user');
      setUser(null);
      resetAllStates();
      setDropdownOpen(false);
      setMobileMenuOpen(false);
      console.log('Navbar - handleLogout - Redirecting to /');
      router.push('/');
      // Forzar una recarga para asegurar que el estado de autenticación se actualice
      setTimeout(() => {
        window.location.reload();
      }, 100);
    } catch (err) {
      console.error('Navbar - handleLogout - Sign out error:', err.message);
      console.log('Navbar - handleLogout - Current Firebase user:', auth.currentUser);
      localStorage.removeItem('user');
      setUser(null);
      resetAllStates();
      setDropdownOpen(false);
      setMobileMenuOpen(false);
      console.log('Navbar - handleLogout - Redirecting to / despite error');
      router.push('/');
      setTimeout(() => {
        window.location.reload();
      }, 100);
    }
  }, [setUser, resetAllStates, router]);

  const toggleMobileMenu = useCallback(() => {
    setMobileMenuOpen((prev) => !prev);
    setDropdownOpen(false); // Cierra el dropdown si está abierto
  }, []);

  const toggleDropdown = useCallback(() => {
    console.log('Navbar - Toggling dropdown, current state:', dropdownOpen);
    setDropdownOpen((prev) => !prev);
    setMobileMenuOpen(false); // Cierra el menú móvil si está abierto
  }, [dropdownOpen]);

  console.log('Navbar - User:', user);
  console.log('Navbar - Rendering dropdown:', user ? 'Yes' : 'No');

  return (
    <nav
      className={`bg-gradient-to-b from-dark-bg to-gray-900 py-4 text-center border-b border-neonCyan/30 shadow-lg fixed top-0 w-full z-50 transition-all duration-300 ${
        scrolled ? 'backdrop-blur-md bg-dark-bg/80' : ''
      }`}
    >
      <div className="container mx-auto px-6 flex justify-between items-center">
        <Link
          href="/"
          className="text-3xl font-bold text-cyan-300 hover:text-cyan-400 transition-colors duration-300 tracking-wide"
        >
          RECOVGLOX
        </Link>

        {/* Botón hamburguesa para móviles */}
        <div className="md:hidden">
          <button
            onClick={toggleMobileMenu}
            className="text-gray-400 hover:text-neonCyan transition-all duration-300 transform hover:scale-110 p-2 rounded-full hover:bg-gray-800"
          >
            {mobileMenuOpen ? <FaTimes size={24} /> : <FaBars size={24} />}
          </button>
        </div>

        {/* Menú para pantallas grandes */}
        <div className="hidden md:flex items-center space-x-6">
          <Link
            href="/"
            className="text-gray-400 text-sm font-medium hover:text-neonCyan transition-all duration-300 hover:scale-105 px-4 py-2 rounded-lg hover:bg-gray-800"
          >
            Inicio
          </Link>
          <Link
            href="/sobre-nosotros"
            className="text-gray-400 text-sm font-medium hover:text-neonCyan transition-all duration-300 hover:scale-105 px-4 py-2 rounded-lg hover:bg-gray-800"
          >
            Sobre Nosotros
          </Link>
          <Link
            href="/sobre-producto"
            className="text-gray-400 text-sm font-medium hover:text-neonCyan transition-all duration-300 hover:scale-105 px-4 py-2 rounded-lg hover:bg-gray-800"
          >
            Sobre el Producto
          </Link>
          {user && (
            <div className="relative">
              <button
                onClick={toggleDropdown}
                className="text-gray-400 hover:text-neonCyan transition-all duration-300 flex items-center space-x-2 px-4 py-2 rounded-lg hover:bg-gray-800"
              >
                <span className="truncate max-w-[200px] text-sm font-medium">{user.nombre || user.email}</span>
                <span className="text-sm">▼</span>
              </button>
              {dropdownOpen && (
                <div
                  className="absolute right-0 top-12 w-64 rounded-lg shadow-xl border border-gray-700 p-4 transition-opacity duration-300 ease-in-out z-50"
                  style={{ backgroundColor: '#1a202c' }}
                >
                  <div className="space-y-4">
                    <p className="text-cyan-300 text-sm font-semibold">
                      Email: <span className="text-gray-400">{user.email}</span>
                    </p>
                    <p className="text-cyan-300 text-sm font-semibold">
                      Usuario: <span className="text-gray-400">{user.nombre || 'N/A'}</span>
                    </p>
                    <p className="text-cyan-300 text-sm font-semibold">
                      Tipo: <span className="text-gray-400">{user.userType === 'physio' ? 'Fisioterapeuta' : 'Básico'}</span>
                    </p>
                    <button
                      onClick={() => {
                        console.log('Navbar - Cerrar Sesión button clicked');
                        handleLogout();
                      }}
                      className="w-full mt-4 bg-red-500 text-white hover:bg-red-600 transition-colors duration-300 py-2 rounded-lg font-semibold text-sm"
                    >
                      Cerrar Sesión
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Menú móvil */}
      {mobileMenuOpen && (
        <div
          className="md:hidden border-t border-neonCyan/30 py-4"
          style={{ backgroundColor: '#1a202c' }}
        >
          <div className="flex flex-col items-center space-y-4 px-6">
            <Link
              href="/"
              onClick={toggleMobileMenu}
              className="text-gray-400 text-sm font-medium hover:text-neonCyan transition-all duration-300 hover:scale-105 px-4 py-2 rounded-lg hover:bg-gray-800"
            >
              Inicio
            </Link>
            <Link
              href="/sobre-nosotros"
              onClick={toggleMobileMenu}
              className="text-gray-400 text-sm font-medium hover:text-neonCyan transition-all duration-300 hover:scale-105 px-4 py-2 rounded-lg hover:bg-gray-800"
            >
              Sobre Nosotros
            </Link>
            <Link
              href="/sobre-producto"
              onClick={toggleMobileMenu}
              className="text-gray-400 text-sm font-medium hover:text-neonCyan transition-all duration-300 hover:scale-105 px-4 py-2 rounded-lg hover:bg-gray-800"
            >
              Sobre el Producto
            </Link>
            {user && (
              <div className="w-full px-6 pt-4 border-t border-neonCyan/30">
                <p className="text-cyan-300 text-sm font-semibold">
                  Email: <span className="text-gray-400">{user.email}</span>
                </p>
                <p className="text-cyan-300 text-sm font-semibold mt-2">
                  Usuario: <span className="text-gray-400">{user.nombre || 'N/A'}</span>
                </p>
                <p className="text-cyan-300 text-sm font-semibold mt-2">
                  Tipo: <span className="text-gray-400">{user.userType === 'physio' ? 'Fisioterapeuta' : 'Básico'}</span>
                </p>
                <button
                  onClick={() => {
                    console.log('Navbar - Cerrar Sesión (mobile) button clicked');
                    handleLogout();
                  }}
                  className="w-full mt-4 bg-red-500 text-white hover:bg-red-600 transition-colors duration-300 py-2 rounded-lg font-semibold text-sm"
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