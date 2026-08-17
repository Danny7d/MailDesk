import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';

export default async function EmailViewPage({ params }: { params: { id: string } }) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/login');
  }

  // Get the email with user authorization check
  const email = await prisma.incomingEmail.findFirst({
    where: {
      id: params.id,
      userId: session.user.id,
    },
  });

  if (!email) {
    notFound();
  }

  // Mark as read if not already read
  if (email.readAt === null) {
    await prisma.incomingEmail.update({
      where: { id: params.id },
      data: { readAt: new Date() },
    });
  }

  // Format recipient list
  const recipients = email.to.join(', ');
  const ccList = email.cc.length > 0 ? email.cc.join(', ') : null;

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/dashboard/inbox"
          className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4"
        >
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Inbox
        </Link>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        {/* Email Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            {email.subject || '(No subject)'}
          </h1>

          <div className="space-y-2 text-sm">
            <div className="flex">
              <span className="text-gray-500 w-16 flex-shrink-0">From:</span>
              <span className="text-gray-900">{email.from}</span>
            </div>

            <div className="flex">
              <span className="text-gray-500 w-16 flex-shrink-0">To:</span>
              <span className="text-gray-900">{recipients}</span>
            </div>

            {ccList && (
              <div className="flex">
                <span className="text-gray-500 w-16 flex-shrink-0">Cc:</span>
                <span className="text-gray-900">{ccList}</span>
              </div>
            )}

            <div className="flex">
              <span className="text-gray-500 w-16 flex-shrink-0">Date:</span>
              <span className="text-gray-900">
                {new Date(email.receivedAt).toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Email Body */}
        <div className="px-6 py-6">
          {email.textBody ? (
            <pre className="whitespace-pre-wrap font-sans text-gray-900 text-sm leading-relaxed">
              {email.textBody}
            </pre>
          ) : email.htmlBody ? (
            <div className="text-sm text-gray-600">
              <p className="mb-2">This email contains HTML content.</p>
              <p className="text-xs text-gray-500">
                HTML rendering will be available in a future update.
              </p>
            </div>
          ) : (
            <p className="text-gray-500 text-sm">No content available</p>
          )}
        </div>
      </div>
    </div>
  );
}
