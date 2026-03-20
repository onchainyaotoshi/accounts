'use client';

import { useUser } from '@/lib/hooks';
import { PageHeader } from '@/components/page-header';

export default function DashboardPage() {
  const { user } = useUser();

  return (
    <>
      <PageHeader
        title="Overview"
        description="Your Yaotoshi account at a glance"
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="card">
          <div className="text-xs font-semibold uppercase tracking-widest text-text-tertiary mb-3">
            Email
          </div>
          <div className="text-lg font-medium">{user?.email}</div>
          <div className="mt-1">
            {user?.email_verified ? (
              <span className="badge-success">Verified</span>
            ) : (
              <span className="badge-danger">Unverified</span>
            )}
          </div>
        </div>
        <div className="card">
          <div className="text-xs font-semibold uppercase tracking-widest text-text-tertiary mb-3">
            Account ID
          </div>
          <div className="font-mono text-sm text-text-secondary break-all">
            {user?.sub}
          </div>
        </div>
      </div>
    </>
  );
}
