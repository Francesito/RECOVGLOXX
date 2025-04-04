// app/layout.jsx
import ClientLayout from './ClientLayout';
import Footer from '../components/Footer';
import { UserProvider } from './UserContext';

export const metadata = {
  title: 'RECOVGLOX Platform',
  description: 'Plataforma para el guante inteligente',
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;600;700&display=swap"
          rel="stylesheet"
        />
        <style>{`
          button {
            transition-duration: 300ms;
          }
          @keyframes gradientAnimation {
            0% {
              background-position: 0% 50%;
            }
            50% {
              background-position: 100% 50%;
            }
            100% {
              background-position: 0% 50%;
            }
          }
        `}</style>
      </head>
      <body
        className="bg-darkBg text-white font-roboto"
        style={{
          margin: 0,
          overflowX: 'hidden',
        }}
      >
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
      </body>
    </html>
  );
}