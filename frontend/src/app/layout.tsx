import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from 'react-hot-toast';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'SGEI - Sistema de Gestão de Equipamentos Informáticos',
  description: 'Gestão centralizada de equipamentos informáticos para instituições',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt">
      <body className={inter.className}>
        {children}
        <Toaster position="top-right" toastOptions={{ duration: 4000, style: { borderRadius: '10px', background: '#333', color: '#fff' } }} />
      </body>
    </html>
  );
}
