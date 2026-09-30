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

    // Return available domains from every saved key without exposing key data.
    const providers = await prisma.connectedProvider.findMany({
      where: {
        userId: session.user.id,
        provider: 'resend',
        status: 'connected',
      },
      orderBy: { createdAt: 'asc' },
    });

    if (providers.length === 0) {
      return NextResponse.json({ senders: [], connections: [] });
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

    const connections = await Promise.all(providers.map(async (provider) => {
      const apiKey = decrypt(provider.encryptedKey, encryptionSecret!);
      const identities = await getSenderIdentities(apiKey);
      const availableDomains = identities.map((identity) => identity.email.toLowerCase());
      const domain = provider.domain === '*' ? '*' : provider.domain.toLowerCase();

      return {
        domain,
        legacy: domain === '*',
        senders: domain === '*' ? availableDomains : [domain],
      };
    }));

    const formattedSenders = [...new Set(connections.flatMap((connection) => connection.senders))];
    return NextResponse.json({ senders: formattedSenders, connections });
  } catch (error) {
    console.error('Failed to fetch sender identities:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sender identities' },
      { status: 500 }
    );
  }
}
