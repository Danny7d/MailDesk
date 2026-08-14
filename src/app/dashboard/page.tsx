import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import Link from 'next/link';

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user?.id) {
    return null;
  }

  // Get user's email count
  const emailCount = await prisma.email.count({
    where: { userId: session.user.id },
  });

  // Get recent emails
  const recentEmails = await prisma.email.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
    take: 5,
  });

  // Check if user has connected Resend
  const connectedProvider = await prisma.connectedProvider.findFirst({
    where: {
      userId: session.user.id,
      provider: 'resend',
      status: 'connected',
    },
  });

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-2">Welcome back, {session.user?.name || session.user?.email || 'User'}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900">Emails Sent</h3>
          <p className="text-3xl font-bold text-blue-600 mt-2">{emailCount}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900">Resend Status</h3>
          <p className={`text-lg font-medium mt-2 ${connectedProvider ? 'text-green-600' : 'text-gray-600'}`}>
            {connectedProvider ? 'Connected ✓' : 'Not connected'}
          </p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900">Quick Action</h3>
          <Link
            href="/dashboard/compose"
            className="inline-block mt-2 bg-blue-600 text-white hover:bg-blue-700 px-4 py-2 rounded-md text-sm font-medium"
          >
            Compose Email
          </Link>
        </div>
      </div>

      {/* Recent Emails */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Recent Emails</h2>
        </div>
        {recentEmails.length === 0 ? (
          <div className="p-6 text-center text-gray-600">
            No emails sent yet.{' '}
            <Link href="/dashboard/compose" className="text-blue-600 hover:text-blue-700">
              Send your first email
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {recentEmails.map((email: any) => (
              <div key={email.id} className="px-6 py-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{email.recipient}</p>
                    <p className="text-sm text-gray-600">{email.subject}</p>
                  </div>
                  <div className="text-right">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                      email.status === 'sent' ? 'bg-green-100 text-green-800' :
                      email.status === 'delivered' ? 'bg-blue-100 text-blue-800' :
                      email.status === 'failed' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {email.status}
                    </span>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(email.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Connect Resend CTA if not connected */}
      {!connectedProvider && (
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">Connect your Resend account</h3>
          <p className="text-blue-800 mb-4">
            Start sending emails by connecting your Resend API key.
          </p>
          <Link
            href="/dashboard/settings"
            className="inline-block bg-blue-600 text-white hover:bg-blue-700 px-4 py-2 rounded-md text-sm font-medium"
          >
            Connect Resend
          </Link>
        </div>
      )}
    </div>
  );
}
