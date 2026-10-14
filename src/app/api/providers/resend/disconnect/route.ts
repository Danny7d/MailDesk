import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { decrypt, validateEncryptionSecret } from '@/lib/encryption';
import { deleteWebhook } from '@/lib/resend';

export async function POST() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const providers = await prisma.connectedProvider.findMany({
      where: {
        userId: session.user.id,
        provider: 'resend',
      },
    });

    const encryptionSecret = process.env.ENCRYPTION_KEY;
    if (validateEncryptionSecret(encryptionSecret)) {
      for (const provider of providers) {
        if (provider.webhookId && provider.encryptedKey) {
          try {
            const apiKey = decrypt(provider.encryptedKey, encryptionSecret!);
            await deleteWebhook(apiKey, provider.webhookId);
          } catch (e) {
            console.error('Failed to delete Resend webhook on disconnect:', e);
          }
        }
      }
    }

    await prisma.connectedProvider.deleteMany({
      where: {
        userId: session.user.id,
        provider: 'resend',
      },
    });

    return NextResponse.json({ message: 'Resend disconnected successfully' });
  } catch (error) {
    console.error('Resend disconnect error:', error);
    return NextResponse.json(
      { error: 'Failed to disconnect Resend' },
      { status: 500 }
    );
  }
}
