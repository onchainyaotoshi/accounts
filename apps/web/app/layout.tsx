import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: `${process.env.NEXT_PUBLIC_APP_NAME || 'Accounts'} - Accounts`,
  description: `Account management for the ${process.env.NEXT_PUBLIC_APP_NAME || 'Accounts'} ecosystem`,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen font-sans">{children}</body>
    </html>
  );
}
