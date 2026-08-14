import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import DashboardLayout from '@/components/dashboard-layout';

export default async function DashboardRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session) {
    redirect('/login');
  }

  return <DashboardLayout>{children}</DashboardLayout>;
}
