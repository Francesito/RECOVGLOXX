// app/layout.jsx
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });

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
          /* Asegurar que el body no tenga márgenes ni desbordamiento */
          body {
            margin: 0;
            overflow-x: hidden;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
          }
          main {
            flex: 1;
          }
        `}</style>
      </head>
      <body className={`${inter.className} bg-darkBg text-white`}>
        <main>{children}</main>
      </body>
    </html>
  );
}