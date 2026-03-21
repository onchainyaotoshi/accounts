'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

export function AuthLayout({
  children,
  title,
  subtitle,
}: {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
}) {
  const [appName, setAppName] = useState('Accounts');

  useEffect(() => {
    setAppName(process.env.NEXT_PUBLIC_APP_NAME || 'Accounts');
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[40%] -left-[20%] w-[70%] h-[70%] rounded-full bg-accent/[0.03] blur-3xl" />
        <div className="absolute -bottom-[30%] -right-[10%] w-[50%] h-[50%] rounded-full bg-accent/[0.02] blur-3xl" />
      </div>
      <div className="relative w-full max-w-[420px]">
        <div className="mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-8 group">
            <div className="w-8 h-8 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center">
              <span className="text-accent font-mono text-sm font-bold">{appName.charAt(0).toUpperCase()}</span>
            </div>
            <span className="text-sm text-text-secondary group-hover:text-text-primary transition-colors">
              {appName.toLowerCase()}
            </span>
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {subtitle && (
            <p className="mt-2 text-sm text-text-secondary">{subtitle}</p>
          )}
        </div>
        <div className="card">{children}</div>
      </div>
    </div>
  );
}
