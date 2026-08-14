import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { encrypt, validateEncryptionSecret } from '@/lib/encryption';
import { validateResendApiKey, getSenderIdentities } from '@/lib/resend';
import { z } from 'zod';

const connectSchema = z.object({
  apiKey: z.string().min(1, 'API key is required'),
});

export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { apiKey } = connectSchema.parse(body);

    // Validate encryption secret
    const encryptionSecret = process.env.ENCRYPTION_KEY;
    if (!validateEncryptionSecret(encryptionSecret)) {
      console.error('Encryption secret is not configured');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    // Validate the API key with Resend
    const isValid = await validateResendApiKey(apiKey);
    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid Resend API key' },
        { status: 400 }
      );
    }

    // Get sender identities
    const senderIdentities = await getSenderIdentities(apiKey);

    // Check if there are any domains
    if (senderIdentities.length === 0) {
      return NextResponse.json(
        { error: 'No verified domains found in your Resend account. Please add and verify a domain in Resend before connecting.' },
        { status: 400 }
      );
    }

    // Encrypt the API key
    const encryptedKey = encrypt(apiKey, encryptionSecret!);

    // Check if user already has a Resend connection
    const existingProvider = await prisma.connectedProvider.findFirst({
      where: {
        userId: session.user.id,
        provider: 'resend',
      },
    });

    if (existingProvider) {
      // Update existing connection
      await prisma.connectedProvider.update({
        where: { id: existingProvider.id },
        data: {
          encryptedKey,
          status: 'connected',
        },
      });
    } else {
      // Create new connection
      await prisma.connectedProvider.create({
        data: {
          userId: session.user.id,
          provider: 'resend',
          encryptedKey,
          status: 'connected',
        },
      });
    }

    return NextResponse.json({
      message: 'Resend connected successfully',
      senderIdentities: senderIdentities.map((s) => s.email),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }

    console.error('Resend connection error:', error);
    return NextResponse.json(
      { error: 'Failed to connect Resend' },
      { status: 500 }
    );
  }
}
