// app/UserContext.jsx
'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, firestore } from './firebase';

const UserContext = createContext();

export function UserProvider({ children }) {
  const [user, setUser] = useState(null);

  // Función para cargar el usuario desde localStorage o Firestore
  const loadUserFromStorage = async (firebaseUser) => {
    console.log('UserProvider - loadUserFromStorage - Firebase user:', firebaseUser ? firebaseUser.uid : 'No user');
    if (!firebaseUser) {
      console.log('UserProvider - loadUserFromStorage - No Firebase user, clearing state');
      setUser(null);
      localStorage.removeItem('user');
      return;
    }

    const storedUser = localStorage.getItem('user');
    console.log('UserProvider - loadUserFromStorage - Stored user:', storedUser);

    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);
      if (parsedUser.uid === firebaseUser.uid) {
        console.log('UserProvider - loadUserFromStorage - Restoring user from localStorage:', parsedUser);
        setUser(parsedUser);
        return;
      }
    }

    // Si no hay datos en localStorage, consultar Firestore
    console.log('UserProvider - loadUserFromStorage - No valid user in localStorage, fetching from Firestore');
    const userId = firebaseUser.uid;
    let userDoc;
    let determinedUserType;

    const physioDoc = await getDoc(doc(firestore, 'fisioterapeutas', userId));
    console.log('UserProvider - loadUserFromStorage - Fisioterapeuta Doc:', physioDoc.exists() ? physioDoc.data() : 'No existe');
    if (physioDoc.exists()) {
      userDoc = physioDoc;
      determinedUserType = 'physio';
    } else {
      const userDocBasic = await getDoc(doc(firestore, 'usuarios', userId));
      console.log('UserProvider - loadUserFromStorage - Usuario Doc:', userDocBasic.exists() ? userDocBasic.data() : 'No existe');
      if (userDocBasic.exists()) {
        userDoc = userDocBasic;
        determinedUserType = 'basic';
      }
    }

    if (userDoc && userDoc.exists()) {
      const userData = { uid: userId, userType: determinedUserType, ...userDoc.data() };
      console.log('UserProvider - loadUserFromStorage - User data fetched from Firestore:', userData);
      setUser(userData);
      localStorage.setItem('user', JSON.stringify(userData));
    } else {
      console.log('UserProvider - loadUserFromStorage - User document not found in database');
      setUser(null);
      localStorage.removeItem('user');
    }
  };

  // Escuchar cambios en el estado de autenticación de Firebase
  useEffect(() => {
    console.log('UserProvider - Setting up auth state listener');
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      console.log('UserProvider - Auth state changed:', firebaseUser ? firebaseUser.uid : 'No user');
      loadUserFromStorage(firebaseUser);
    });

    return () => {
      console.log('UserProvider - Cleaning up auth state listener');
      unsubscribe();
    };
  }, []);

  // Escuchar cambios en localStorage para actualizar el estado user
  useEffect(() => {
    const handleStorageChange = () => {
      console.log('UserProvider - Storage event triggered');
      loadUserFromStorage(auth.currentUser);
    };

    const handleCustomStorageUpdate = () => {
      console.log('UserProvider - Custom storage update event triggered');
      loadUserFromStorage(auth.currentUser);
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('custom-storage-update', handleCustomStorageUpdate);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('custom-storage-update', handleCustomStorageUpdate);
    };
  }, []);

  const resetUser = () => {
    console.log('UserProvider - Resetting user state');
    setUser(null);
    localStorage.removeItem('user');
    window.dispatchEvent(new Event('custom-storage-update'));
  };

  return (
    <UserContext.Provider value={{ user, setUser, resetUser }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}