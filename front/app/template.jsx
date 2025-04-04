'use client';

import { UserProvider } from './UserContext';
import ClientLayout from './ClientLayout';
import Footer from '../components/Footer';

export default function Template({ children }) {
  return (
    <>
      <div
        className="fixed inset-0 z-[-1]"
        style={{
          backgroundSize: '200% 200%',
          animation: 'gradientAnimation 15s ease infinite',
          backgroundImage: 'linear-gradient(to bottom right, #0a0a0a, rgba(107, 33, 168, 0.2), #0a0a0a)',
        }}
      />
      <UserProvider>
        <ClientLayout>{children}</ClientLayout>
      </UserProvider>
      <Footer />
    </>
  );
}