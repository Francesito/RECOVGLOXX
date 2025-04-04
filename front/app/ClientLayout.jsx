// app/ClientLayout.jsx
'use client';

import Navbar from '../components/Navbar';
import { useUser } from './UserContext';

export default function ClientLayout({ children }) {
  const { user, setUser, resetUser } = useUser();

  return (
    <>
      <Navbar user={user} setUser={setUser} resetAllStates={resetUser} />
      <main style={{ minHeight: 'calc(100vh - 150px)', paddingTop: '80px' }}>{children}</main>
    </>
  );
}