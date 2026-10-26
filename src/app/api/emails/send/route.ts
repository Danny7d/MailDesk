import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { decrypt, validateEncryptionSecret } from '@/lib/encryption';
import { sendEmail, formatEmailHtml } from '@/lib/resend';
import { parseAddressList, MAX_RECIPIENTS } from '@/lib/addresses';
import { z } from 'zod';

const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 10; // 10 emails per minute

// Counts the user's recent emails in Postgres so the limit holds across serverless
// instances (an in-memory counter resets on every cold start and is not shared).
async function isRateLimited(userId: string): Promise<boolean> {
  const recent = await prisma.email.count({
    where: {
      userId,
      createdAt: { gte: new Date(Date.now() - RATE_LIMIT_WINDOW_MS) },
    },
  });
  return recent >= RATE_LIMIT_MAX_REQUESTS;
}

const sendEmailSchema = z.object({
  sender: z.string().min(1, 'Sender is required'),
  // Comma-separated address lists
  recipient: z.string().min(1, 'At least one recipient is required').max(5000),
  cc: z.string().max(5000).optional(),
  bcc: z.string().max(5000).optional(),
  // Message-ID of the email being replied to; strict format so it can't inject headers
  inReplyTo: z
    .string()
    .regex(/^<[^<>\s]{1,300}>$/, 'Invalid In-Reply-To')
    .optional(),
  subject: z.string().min(1, 'Subject is required'),
  message: z.string().min(1, 'Message is required'),
});

export async function POST(request: Request) {
  let stage = 'authenticate';
  let providerAccepted = false;
  let providerMessageId: string | undefined;

  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check rate limit
    if (await isRateLimited(session.user.id)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please wait before sending more emails.' },
        { status: 429 }
      );
    }

    stage = 'validate_request';
    const body = await request.json();
    const { sender, recipient, cc: ccInput, bcc: bccInput, inReplyTo, subject, message } =
      sendEmailSchema.parse(body);

    const toList = parseAddressList(recipient);
    const ccList = parseAddressList(ccInput);
    const bccList = parseAddressList(bccInput);
    const invalid = [...toList.invalid, ...ccList.invalid, ...bccList.invalid];
    if (invalid.length > 0) {
      return NextResponse.json(
        { error: `Invalid email address: ${invalid.join(', ')}` },
        { status: 400 }
      );
    }
    if (toList.addresses.length === 0) {
      return NextResponse.json({ error: 'At least one recipient is required' }, { status: 400 });
    }
    // An address appears once across To, Cc and Bcc (To wins, then Cc)
    const to = toList.addresses;
    const seenAddresses = new Set(to.map((a) => a.toLowerCase()));
    const cc = ccList.addresses.filter((a) => !seenAddresses.has(a.toLowerCase()));
    cc.forEach((a) => seenAddresses.add(a.toLowerCase()));
    const bcc = bccList.addresses.filter((a) => !seenAddresses.has(a.toLowerCase()));
    if (to.length + cc.length + bcc.length > MAX_RECIPIENTS) {
      return NextResponse.json(
        { error: `Too many recipients (maximum ${MAX_RECIPIENTS})` },
        { status: 400 }
      );
    }

    const senderDomain = sender.slice(sender.lastIndexOf('@') + 1).toLowerCase();
    stage = 'load_provider_key';
    const provider = await prisma.connectedProvider.findFirst({
      where: {
        userId: session.user.id,
        provider: 'resend',
        status: 'connected',
        domain: senderDomain,
      },
    });
    const fallbackProvider = provider || await prisma.connectedProvider.findFirst({
      where: {
        userId: session.user.id,
        provider: 'resend',
        status: 'connected',
        domain: '*',
      },
    });

    if (!fallbackProvider) {
      return NextResponse.json(
        { error: `No Resend API key is connected for ${senderDomain}. Add one in settings.` },
        { status: 400 }
      );
    }

    stage = 'decrypt_provider_key';
    // Validate encryption secret
    const encryptionSecret = process.env.ENCRYPTION_KEY;
    if (!validateEncryptionSecret(encryptionSecret)) {
      console.error('Encryption secret is not configured');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    // Decrypt the API key
    const apiKey = decrypt(fallbackProvider.encryptedKey, encryptionSecret!);

    // Send the email with preserved spacing and formatting
    stage = 'send_with_resend';
    const result = await sendEmail(apiKey, sender, to, subject, message, message, {
      cc,
      bcc,
      headers: inReplyTo ? { 'In-Reply-To': inReplyTo, References: inReplyTo } : undefined,
    });

    if (!result.success) {
      // Log the error without exposing sensitive information
      console.error('Email send failed:', result.error);

      // Save failed email to database
      stage = 'save_failed_email_history';
      await prisma.email.create({
        data: {
          userId: session.user.id,
          provider: 'resend',
          sender,
          recipient: to.join(', '),
          cc: cc.length ? cc.join(', ') : null,
          bcc: bcc.length ? bcc.join(', ') : null,
          subject,
          body: message,
          status: 'failed',
          errorMessage: result.error,
        },
      });

      return NextResponse.json(
        { error: result.error || 'Failed to send email' },
        { status: 500 }
      );
    }

    providerAccepted = true;
    providerMessageId = result.messageId;

    // Save successful email to database
    stage = 'save_email_history';
    await prisma.email.create({
      data: {
        userId: session.user.id,
        provider: 'resend',
        sender,
        recipient: to.join(', '),
        cc: cc.length ? cc.join(', ') : null,
        bcc: bcc.length ? bcc.join(', ') : null,
        subject,
        body: message,
        messageId: result.messageId,
        status: 'sent',
      },
    });

    // Deliver directly to any registered MailDesk users among the recipients.
    // Bcc recipients get a copy, but the Bcc list is never stored on the delivered copy.
    try {
      const everyone = [...to, ...cc, ...bcc].map((a) => a.toLowerCase().trim());
      const deliveredTo = new Set<string>();

      for (const address of new Set(everyone)) {
        const recipientUser =
          (await prisma.user.findUnique({ where: { email: address } })) ||
          (
            await prisma.emailAddress.findUnique({
              where: { email: address },
              include: { user: true },
            })
          )?.user;

        if (!recipientUser || deliveredTo.has(recipientUser.id)) continue;
        deliveredTo.add(recipientUser.id);

        const base =
          result.messageId || `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        const inboundEmailId = `inbound_${base}_${recipientUser.id}`;

        const existingIncoming = await prisma.incomingEmail.findUnique({
          where: { emailId: inboundEmailId },
        });
        if (existingIncoming) continue;

        await prisma.incomingEmail.create({
          data: {
            userId: recipientUser.id,
            emailId: inboundEmailId,
            messageId: result.messageId || null,
            from: sender,
            subject,
            to,
            cc,
            bcc: [],
            textBody: message,
            htmlBody: formatEmailHtml(message),
            provider: 'resend',
            receivedAt: new Date(),
          },
        });
      }
    } catch (deliverError) {
      console.error('Failed to deliver to local incoming inbox:', deliverError);
    }

    return NextResponse.json({
      message: 'Email sent successfully',
      messageId: result.messageId,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }

    console.error('Email send error:', { stage, error });
    if (providerAccepted) {
      return NextResponse.json(
        {
          message: 'Resend accepted the email, but MailDesk could not save it to your history.',
          messageId: providerMessageId,
        },
        { status: 202 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to send email' },
      { status: 500 }
    );
  }
}
