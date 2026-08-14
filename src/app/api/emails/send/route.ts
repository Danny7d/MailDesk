import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { decrypt, validateEncryptionSecret } from '@/lib/encryption';
import { sendEmail } from '@/lib/resend';
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

    const body = await request.json();
    const { sender, recipient, subject, message } = sendEmailSchema.parse(body);

    // Get the user's Resend connection
    const provider = await prisma.connectedProvider.findFirst({
      where: {
        userId: session.user.id,
        provider: 'resend',
        status: 'connected',
      },
    });

    if (!provider) {
      return NextResponse.json(
        { error: 'No Resend account connected. Please connect your account in settings.' },
        { status: 400 }
      );
    }

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
    const apiKey = decrypt(provider.encryptedKey, encryptionSecret!);

    // Send the email
    const result = await sendEmail(apiKey, sender, recipient, subject, message);

    if (!result.success) {
      // Log the error without exposing sensitive information
      console.error('Email send failed:', result.error);

      // Save failed email to database
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

    // Save successful email to database
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

    console.error('Email send error:', error);
    return NextResponse.json(
      { error: 'Failed to send email' },
      { status: 500 }
    );
  }
}
