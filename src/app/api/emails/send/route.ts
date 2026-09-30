import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { decrypt, validateEncryptionSecret } from '@/lib/encryption';
import { sendEmail, formatEmailHtml } from '@/lib/resend';
import { z } from 'zod';

// Simple rate limiting using in-memory map (for MVP)
// In production, this should use Redis or a similar distributed system
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 10; // 10 emails per minute

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const userLimit = rateLimitMap.get(userId);

  if (!userLimit || now > userLimit.resetTime) {
    rateLimitMap.set(userId, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }

  if (userLimit.count >= RATE_LIMIT_MAX_REQUESTS) {
    return false;
  }

  userLimit.count++;
  return true;
}

const sendEmailSchema = z.object({
  sender: z.string().min(1, 'Sender is required'),
  recipient: z.string().email('Invalid recipient email'),
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
    if (!checkRateLimit(session.user.id)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please wait before sending more emails.' },
        { status: 429 }
      );
    }

    stage = 'validate_request';
    const body = await request.json();
    const { sender, recipient, subject, message } = sendEmailSchema.parse(body);

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
    const result = await sendEmail(apiKey, sender, recipient, subject, message, message);

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
          recipient,
          subject,
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
        recipient,
        subject,
        messageId: result.messageId,
        status: 'sent',
      },
    });

    // If recipient is a registered user (e.g. user sending to their logged-in email or another user),
    // deliver directly to their incoming inbox
    try {
      const normalizedRecipient = recipient.toLowerCase().trim();
      const recipientUser =
        (await prisma.user.findUnique({
          where: { email: normalizedRecipient },
        })) ||
        (
          await prisma.emailAddress.findUnique({
            where: { email: normalizedRecipient },
            include: { user: true },
          })
        )?.user;

      if (recipientUser) {
        const inboundEmailId = result.messageId
          ? `inbound_${result.messageId}`
          : `inbound_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

        const existingIncoming = await prisma.incomingEmail.findFirst({
          where: {
            OR: [
              { emailId: inboundEmailId },
              ...(result.messageId ? [{ messageId: result.messageId }] : []),
            ],
          },
        });

        if (!existingIncoming) {
          await prisma.incomingEmail.create({
            data: {
              userId: recipientUser.id,
              emailId: inboundEmailId,
              messageId: result.messageId || null,
              from: sender,
              subject,
              to: [recipient],
              cc: [],
              bcc: [],
              textBody: message,
              htmlBody: formatEmailHtml(message),
              provider: 'resend',
              receivedAt: new Date(),
            },
          });
        }
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
