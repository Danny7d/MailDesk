import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import Link from 'next/link';

export default async function InboxPage() {
  const session = await auth();

  if (!session?.user?.id) {
    return null;
  }

  // Get incoming emails for the user
  const emails = await prisma.incomingEmail.findMany({
    where: { userId: session.user.id },
    orderBy: { receivedAt: 'desc' },
    take: 20,
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
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Inbox</h1>
        <p className="text-gray-600 mt-2">
          {unreadCount > 0 ? `${unreadCount} unread message${unreadCount > 1 ? 's' : ''}` : 'No unread messages'}
        </p>
      </div>

      <div className="bg-white rounded-lg border border-gray-200">
        {emails.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-gray-400 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No emails yet</h3>
            <p className="text-gray-600">
              Your inbox is empty. Emails sent to your MailDesk address will appear here.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {emails.map((email) => (
              <Link
                key={email.id}
                href={`/dashboard/inbox/${email.id}`}
                className={`block px-6 py-4 hover:bg-gray-50 transition-colors ${
                  email.readAt === null ? 'bg-blue-50' : ''
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className={`text-sm font-medium truncate ${
                        email.readAt === null ? 'text-gray-900 font-semibold' : 'text-gray-700'
                      }`}>
                        {email.from}
                      </p>
                      {email.readAt === null && (
                        <span className="inline-block w-2 h-2 bg-blue-600 rounded-full flex-shrink-0"></span>
                      )}
                    </div>
                    <p className={`text-sm truncate mb-1 ${
                      email.readAt === null ? 'text-gray-900 font-medium' : 'text-gray-600'
                    }`}>
                      {email.subject || '(No subject)'}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {email.textBody ? email.textBody.slice(0, 100) : '(No content)'}
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
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
