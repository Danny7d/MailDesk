import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { decrypt, validateEncryptionSecret } from '@/lib/encryption';
import { getSenderIdentities } from '@/lib/resend';

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the user's Resend connection
    const provider = await prisma.connectedProvider.findFirst({
      where: {
        userId: session.user.id,
        provider: 'resend',
        status: 'connected',
      },
    });

    if (!provider) {
      return NextResponse.json({ senders: [] });
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

    // Get sender identities
    const senders = await getSenderIdentities(apiKey);

    // Format senders for the UI
    const formattedSenders = senders.map((s) => s.email);

    return NextResponse.json({ senders: formattedSenders });
  } catch (error) {
    console.error('Failed to fetch sender identities:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sender identities' },
      { status: 500 }
    );
  }
}
