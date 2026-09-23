import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { IncomingEmail } from '@prisma/client';
import Link from 'next/link';

export default async function InboxPage() {
  const session = await auth();

  if (!session?.user?.id) {
    return null;
  }

  // Ensure the logged-in user's email is registered in EmailAddress if not already
  if (session.user.email) {
    const cleanUserEmail = session.user.email.toLowerCase().trim();
    const existing = await prisma.emailAddress.findUnique({
      where: { email: cleanUserEmail },
    });
    if (!existing) {
      await prisma.emailAddress
        .create({
          data: {
            userId: session.user.id,
            email: cleanUserEmail,
            domain: cleanUserEmail.split('@')[1] || 'local',
            verified: true,
          },
        })
        .catch(() => {});
    }
  }

  // Get incoming emails for the user
  const emails = await prisma.incomingEmail.findMany({
    where: { userId: session.user.id },
    orderBy: { receivedAt: 'desc' },
    take: 50,
  });

  // Get unread count
  const unreadCount = await prisma.incomingEmail.count({
    where: {
      userId: session.user.id,
      readAt: null,
    },
  });

  return (
    <div>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Inbox</h1>
          <p className="text-gray-600 mt-1">
            {unreadCount > 0 ? `${unreadCount} unread message${unreadCount > 1 ? 's' : ''}` : 'No unread messages'}
          </p>
        </div>
        {session.user.email && (
          <div className="bg-blue-50 border border-blue-200 text-blue-800 px-3.5 py-2 rounded-lg text-sm flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-blue-600">Receiving At:</span>
            <span className="font-mono font-medium">{session.user.email}</span>
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        {emails.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-gray-400 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No emails yet</h3>
            <p className="text-gray-600 mb-4">
              Your inbox is empty. Emails sent to{' '}
              <strong className="text-gray-800">{session.user.email}</strong> will appear here.
            </p>
            <Link
              href="/dashboard/compose"
              className="inline-block bg-blue-600 text-white hover:bg-blue-700 px-4 py-2 rounded-md text-sm font-medium"
            >
              Compose Test Email
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {emails.map((email: IncomingEmail) => {
              const previewText = email.textBody
                ? email.textBody.slice(0, 120)
                : email.htmlBody
                ? email.htmlBody.replace(/<[^>]*>/g, '').trim().slice(0, 120)
                : '(No content)';

              return (
                <Link
                  key={email.id}
                  href={`/dashboard/inbox/${email.id}`}
                  className={`block px-6 py-4 hover:bg-gray-50 transition-colors ${
                    email.readAt === null ? 'bg-blue-50/60' : ''
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className={`text-sm truncate ${
                          email.readAt === null ? 'text-gray-900 font-semibold' : 'text-gray-700 font-medium'
                        }`}>
                          {email.from}
                        </p>
                        {email.readAt === null && (
                          <span className="inline-block w-2 h-2 bg-blue-600 rounded-full flex-shrink-0" />
                        )}
                      </div>
                      <p className={`text-sm truncate mb-1 ${
                        email.readAt === null ? 'text-gray-900 font-medium' : 'text-gray-600'
                      }`}>
                        {email.subject || '(No subject)'}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {previewText}
                      </p>
                    </div>
                    <div className="ml-4 flex-shrink-0 text-right">
                      <p className="text-xs text-gray-500">
                        {new Date(email.receivedAt).toLocaleDateString()}
                      </p>
                      <p className="text-xs text-gray-400">
                        {new Date(email.receivedAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
