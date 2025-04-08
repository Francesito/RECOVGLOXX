// app/ClientLayout.jsx
'use client';

import { useUser } from './UserContext';

export default function ClientLayout({ children }) {
  const { user, setUser, resetUser } = useUser();

  return (
    <>
      <main style={{ minHeight: 'calc(100vh - 150px)', paddingTop: '80px' }}>{children}</main>
    </>
  );
}