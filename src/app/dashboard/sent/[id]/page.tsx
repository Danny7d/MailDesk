import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { decrypt, validateEncryptionSecret } from '@/lib/encryption';
import { getSentEmailContent } from '@/lib/resend';
import { LocalDateTime } from '@/components/LocalDateTime';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';

function htmlToText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|h[1-6]|li|tr)>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export default async function SentEmailViewPage({
  params,
}: {
  params: Promise<{ id: string }> | { id: string };
}) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/login');
  }

  const { id } = await params;

  const email = await prisma.email.findFirst({
    where: { id, userId: session.user.id },
  });

  if (!email) {
    notFound();
  }

  let body = email.body;

  // Emails sent before bodies were stored: try to recover the content from Resend.
  if (!body && email.messageId) {
    const encryptionSecret = process.env.ENCRYPTION_KEY;
    if (validateEncryptionSecret(encryptionSecret)) {
      const provider = await prisma.connectedProvider.findFirst({
        where: { userId: session.user.id, provider: 'resend', status: 'connected' },
        orderBy: { createdAt: 'asc' },
      });
      if (provider) {
        try {
          const apiKey = decrypt(provider.encryptedKey, encryptionSecret!);
          const content = await getSentEmailContent(apiKey, email.messageId);
          body = content?.text || (content?.html ? htmlToText(content.html) : null);
        } catch (e) {
          console.error('Could not recover sent email body:', e);
        }
      }
    }
  }

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/dashboard/sent"
          className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4"
        >
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Sent
        </Link>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">{email.subject}</h1>

          <div className="space-y-2 text-sm">
            <div className="flex">
              <span className="text-gray-500 w-16 flex-shrink-0">From:</span>
              <span className="text-gray-900">{email.sender}</span>
            </div>
            <div className="flex">
              <span className="text-gray-500 w-16 flex-shrink-0">To:</span>
              <span className="text-gray-900">{email.recipient}</span>
            </div>
            <div className="flex">
              <span className="text-gray-500 w-16 flex-shrink-0">Date:</span>
              <span className="text-gray-900">
                <LocalDateTime date={email.createdAt} mode="datetime" />
              </span>
            </div>
            <div className="flex">
              <span className="text-gray-500 w-16 flex-shrink-0">Status:</span>
              <span className="text-gray-900">{email.status}</span>
            </div>
            {email.errorMessage && (
              <div className="flex">
                <span className="text-gray-500 w-16 flex-shrink-0">Error:</span>
                <span className="text-red-700">{email.errorMessage}</span>
              </div>
            )}
          </div>
        </div>

        <div className="px-6 py-6">
          {body ? (
            // Rendered as plain text on purpose: no HTML injection from stored content.
            <pre className="whitespace-pre-wrap font-sans text-gray-900 text-sm leading-relaxed">
              {body}
            </pre>
          ) : (
            <p className="text-gray-500 text-sm">
              The content of this email wasn&apos;t saved and couldn&apos;t be recovered from Resend.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
