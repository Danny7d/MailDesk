import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import DashboardLayout from '@/components/dashboard-layout';
import { authConfig } from '@/lib/auth';

export default async function DashboardRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authConfig);

  if (!session) {
    redirect('/login');
  }

  return <DashboardLayout>{children}</DashboardLayout>;
}
