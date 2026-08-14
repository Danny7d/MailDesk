import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import Link from 'next/link';

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user?.id) {
    return null;
  }

  // Get all emails for the user
  const emails = await prisma.email.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
  });

  // Get user's email count
  const emailCount = emails.length;

  // Get recent emails
  const recentEmails = emails.slice(0, 5);

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
          <div className="p-12 text-center">
            <div className="text-gray-400 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No emails sent yet</h3>
            <p className="text-gray-600 mb-4">Your sent emails will appear here</p>
            <Link
              href="/dashboard/compose"
              className="inline-block bg-blue-600 text-white hover:bg-blue-700 px-4 py-2 rounded-md text-sm font-medium"
            >
              Compose Email
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
