import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { IncomingEmail } from '@prisma/client';
import Link from 'next/link';

export default async function InboxPage() {
  const session = await auth();

  if (!session?.user?.id) {
    return null;
  }

  const connections = await prisma.connectedProvider.findMany({
    where: {
      userId: session.user.id,
      provider: 'resend',
      status: 'connected',
    },
    orderBy: { createdAt: 'asc' },
  });

  const receivingDomains = connections
    .map((c) => c.domain)
    .filter((d) => d && d !== '*')
    .map((d) => d.toLowerCase());

  const inboundReady = connections.some((c) => c.inboundEnabled);

  const emails = await prisma.incomingEmail.findMany({
    where: { userId: session.user.id },
    orderBy: { receivedAt: 'desc' },
    take: 50,
  });

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
            {unreadCount > 0
              ? `${unreadCount} unread message${unreadCount > 1 ? 's' : ''}`
              : 'No unread messages'}
          </p>
        </div>
        {receivingDomains.length > 0 ? (
          <div className="bg-blue-50 border border-blue-200 text-blue-800 px-3.5 py-2 rounded-lg text-sm">
            <span className="text-xs font-semibold uppercase tracking-wider text-blue-600 block mb-1">
              Receiving on
            </span>
            <div className="flex flex-wrap gap-2">
              {receivingDomains.map((d) => (
                <span key={d} className="font-mono font-medium">
                  *@{d}
                </span>
              ))}
            </div>
            {!inboundReady && (
              <p className="mt-1 text-xs text-amber-700">
                Webhook not fully set up — check Settings / Resend.
              </p>
            )}
          </div>
        ) : (
          <div className="bg-amber-50 border border-amber-200 text-amber-900 px-3.5 py-2 rounded-lg text-sm">
            Connect a Resend domain in{' '}
            <Link href="/dashboard/settings" className="underline font-medium">
              Settings
            </Link>{' '}
            to start receiving.
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        {emails.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-gray-400 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No emails yet</h3>
            {receivingDomains.length > 0 ? (
              <p className="text-gray-600 mb-4 max-w-md mx-auto">
                Send mail to any address on your connected domain
                {receivingDomains.length > 1 ? 's' : ''}{' '}
                {receivingDomains.map((d) => (
                  <strong key={d} className="text-gray-800 font-mono">
                    *@{d}{' '}
                  </strong>
                ))}
                after enabling <strong>receiving</strong> and the MX record in Resend.
              </p>
            ) : (
              <p className="text-gray-600 mb-4">
                Connect your Resend API key and domain in Settings to receive email here.
              </p>
            )}
            <Link
              href="/dashboard/settings"
              className="inline-block bg-blue-600 text-white hover:bg-blue-700 px-4 py-2 rounded-md text-sm font-medium"
            >
              Open Settings
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
                        <p
                          className={`text-sm truncate ${
                            email.readAt === null
                              ? 'text-gray-900 font-semibold'
                              : 'text-gray-700 font-medium'
                          }`}
                        >
                          {email.from}
                        </p>
                        {email.readAt === null && (
                          <span className="inline-block w-2 h-2 bg-blue-600 rounded-full flex-shrink-0" />
                        )}
                      </div>
                      <p
                        className={`text-sm truncate mb-1 ${
                          email.readAt === null ? 'text-gray-900 font-medium' : 'text-gray-600'
                        }`}
                      >
                        {email.subject || '(No subject)'}
                      </p>
                      <p className="text-xs text-gray-500 truncate">{previewText}</p>
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
