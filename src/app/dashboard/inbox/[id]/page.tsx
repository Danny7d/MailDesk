import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { LocalDateTime } from '@/components/LocalDateTime';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';

// Email HTML is untrusted input from the sender. Render it in a sandboxed iframe:
// no scripts, no same-origin access to the dashboard, and a strict CSP as a second layer.
function buildSandboxedDocument(html: string): string {
  const csp =
    "default-src 'none'; img-src https: data:; style-src 'unsafe-inline'; font-src https: data:";
  return `<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="${csp}"><base target="_blank"><style>body{margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:14px;line-height:1.6;color:#111827;word-wrap:break-word}img{max-width:100%;height:auto}</style></head><body>${html}</body></html>`;
}

export default async function EmailViewPage({
  params,
}: {
  params: Promise<{ id: string }> | { id: string };
}) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/login');
  }

  const { id } = await params;

  const email = await prisma.incomingEmail.findFirst({
    where: {
      id,
      userId: session.user.id,
    },
  });

  if (!email) {
    notFound();
  }

  if (email.readAt === null) {
    await prisma.incomingEmail.update({
      where: { id },
      data: { readAt: new Date() },
    });
  }

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
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-start justify-between gap-4 mb-4">
            <h1 className="text-2xl font-bold text-gray-900">
              {email.subject || '(No subject)'}
            </h1>
            <Link
              href={`/dashboard/compose?replyTo=${email.id}`}
              className="flex-shrink-0 bg-blue-600 text-white hover:bg-blue-700 px-4 py-2 rounded-md text-sm font-medium"
            >
              Reply
            </Link>
          </div>

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
                <LocalDateTime date={email.receivedAt} mode="datetime" />
              </span>
            </div>
          </div>
        </div>

        <div className="px-6 py-6">
          {email.htmlBody ? (
            <iframe
              title="Email content"
              sandbox="allow-popups allow-popups-to-escape-sandbox"
              referrerPolicy="no-referrer"
              srcDoc={buildSandboxedDocument(email.htmlBody)}
              className="w-full h-[70vh] border-0"
            />
          ) : email.textBody ? (
            <pre className="whitespace-pre-wrap font-sans text-gray-900 text-sm leading-relaxed">
              {email.textBody}
            </pre>
          ) : (
            <p className="text-gray-500 text-sm">No content available</p>
          )}
        </div>
      </div>
    </div>
  );
}
