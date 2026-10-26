import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { extractAddress } from '@/lib/addresses';
import { htmlToText } from '@/lib/html-text';

const MAX_QUOTE_CHARS = 5000;
const RFC_MESSAGE_ID = /^<[^<>\s]{1,300}>$/;

function asMessageId(value: unknown): string | null {
  return typeof value === 'string' && RFC_MESSAGE_ID.test(value.trim()) ? value.trim() : null;
}

// Only a real RFC 5322 Message-ID ("<id@host>") can be used for threading headers.
function pickMessageId(email: { messageId: string | null; headers: unknown }): string | null {
  const direct = asMessageId(email.messageId);
  if (direct) return direct;
  if (email.headers && typeof email.headers === 'object') {
    for (const [key, value] of Object.entries(email.headers as Record<string, unknown>)) {
      if (key.toLowerCase() === 'message-id') {
        const fromHeader = asMessageId(value);
        if (fromHeader) return fromHeader;
      }
    }
  }
  return null;
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;
  const email = await prisma.incomingEmail.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!email) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const subject = email.subject || '';
  const original = (email.textBody || (email.htmlBody ? htmlToText(email.htmlBody) : '')).trim();
  const clipped =
    original.length > MAX_QUOTE_CHARS ? `${original.slice(0, MAX_QUOTE_CHARS)}\n[...]` : original;
  const quoted = clipped
    .split('\n')
    .map((line) => `> ${line}`)
    .join('\n');

  return NextResponse.json({
    to: extractAddress(email.from),
    subject: /^re:/i.test(subject) ? subject : `Re: ${subject || '(no subject)'}`,
    inReplyTo: pickMessageId(email),
    quote: `On ${email.receivedAt.toUTCString()}, ${email.from} wrote:\n${quoted}`,
  });
}
