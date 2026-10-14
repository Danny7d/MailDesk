import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { encrypt, decrypt, validateEncryptionSecret } from '@/lib/encryption';
import {
  validateResendApiKey,
  getSenderIdentities,
  createInboundWebhook,
  enableDomainReceiving,
  deleteWebhook,
} from '@/lib/resend';
import { z } from 'zod';

const connectSchema = z.object({
  apiKey: z.string().trim().min(1, 'API key is required'),
});

export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { apiKey } = connectSchema.parse(body);

    const encryptionSecret = process.env.ENCRYPTION_KEY;
    if (!validateEncryptionSecret(encryptionSecret)) {
      console.error('Encryption secret is not configured');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    const isValid = await validateResendApiKey(apiKey);
    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid Resend API key' },
        { status: 400 }
      );
    }

    // Discover every domain available to this key — user never types a domain here
    const senderIdentities = await getSenderIdentities(apiKey);

    if (senderIdentities.length === 0) {
      return NextResponse.json(
        {
          error:
            'No domains found in your Resend account. Add and verify a domain in Resend before connecting.',
        },
        { status: 400 }
      );
    }

    const domains = senderIdentities.map((s) => s.email.toLowerCase());
    const encryptedKey = encrypt(apiKey, encryptionSecret!);

    // Remove any previous Resend connections for this user (and their webhooks)
    const existingProviders = await prisma.connectedProvider.findMany({
      where: {
        userId: session.user.id,
        provider: 'resend',
      },
    });

    for (const existing of existingProviders) {
      if (existing.webhookId && existing.encryptedKey) {
        try {
          const oldKey = decrypt(existing.encryptedKey, encryptionSecret!);
          await deleteWebhook(oldKey, existing.webhookId);
        } catch (e) {
          console.error('Failed to delete old Resend webhook:', e);
        }
      }
    }

    if (existingProviders.length > 0) {
      await prisma.connectedProvider.deleteMany({
        where: {
          userId: session.user.id,
          provider: 'resend',
        },
      });
    }

    // One account-wide key; domains are chosen only on Compose "From"
    const created = await prisma.connectedProvider.create({
      data: {
        userId: session.user.id,
        provider: 'resend',
        domain: '*',
        encryptedKey,
        status: 'connected',
      },
    });
    const providerId = created.id;

    // Register each discovered domain for inbox routing / display
    for (const d of domains) {
      const markerEmail = `inbound@${d}`;
      const existingAddr = await prisma.emailAddress.findUnique({
        where: { email: markerEmail },
      });
      if (!existingAddr) {
        await prisma.emailAddress
          .create({
            data: {
              userId: session.user.id,
              email: markerEmail,
              domain: d,
              verified: true,
            },
          })
          .catch(() => {
            /* unique race */
          });
      } else if (existingAddr.userId !== session.user.id) {
        // Domain already claimed by another MailDesk user — skip quietly
        console.warn(`EmailAddress ${markerEmail} already owned by another user`);
      }
    }

    // Create per-user inbound webhook in their Resend account
    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/$/, '');
    let inboundEnabled = false;
    let inboundNote: string | undefined;

    if (appUrl && appUrl.startsWith('https://')) {
      const webhookEndpoint = `${appUrl}/api/webhooks/resend/${providerId}`;
      const webhookResult = await createInboundWebhook(apiKey, webhookEndpoint);

      if (webhookResult.success && webhookResult.webhookId && webhookResult.signingSecret) {
        const encryptedWebhookSecret = encrypt(webhookResult.signingSecret, encryptionSecret!);
        await prisma.connectedProvider.update({
          where: { id: providerId },
          data: {
            webhookId: webhookResult.webhookId,
            encryptedWebhookSecret,
            inboundEnabled: true,
          },
        });
        inboundEnabled = true;

        for (const identity of senderIdentities) {
          if (identity.domainId) {
            await enableDomainReceiving(apiKey, identity.domainId);
          }
        }

        inboundNote =
          'Inbound webhook created. In Resend, enable Receiving and add the MX record for each domain you want to receive on.';
      } else {
        inboundNote =
          webhookResult.error ||
          'Could not create inbound webhook automatically. You can still send; for receiving, add a webhook in Resend pointing at this app.';
      }
    } else {
      inboundNote =
        'NEXT_PUBLIC_APP_URL must be a public https URL for automatic inbound webhooks. Set it and reconnect, or create the webhook manually in Resend.';
    }

    return NextResponse.json({
      message: 'Resend connected successfully',
      senderIdentities: domains,
      domain: '*',
      inboundEnabled,
      inboundNote,
      providerId,
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
