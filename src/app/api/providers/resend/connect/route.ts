import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { encrypt, validateEncryptionSecret } from '@/lib/encryption';
import {
  validateResendApiKey,
  getSenderIdentities,
  createInboundWebhook,
  enableDomainReceiving,
} from '@/lib/resend';
import { z } from 'zod';

const connectSchema = z.object({
  apiKey: z.string().trim().min(1, 'API key is required'),
  domain: z.string().trim().toLowerCase().min(1, 'Domain is required').optional(),
});

export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { apiKey, domain } = connectSchema.parse(body);

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

    const requestedDomain = domain?.replace(/^@/, '');
    if (domain && !requestedDomain) {
      return NextResponse.json({ error: 'Enter a valid sending domain' }, { status: 400 });
    }
    if (
      requestedDomain &&
      !senderIdentities.some((identity) => identity.email.toLowerCase() === requestedDomain)
    ) {
      return NextResponse.json(
        { error: 'That domain is not available for this Resend API key' },
        { status: 400 }
      );
    }

    const encryptedKey = encrypt(apiKey, encryptionSecret!);
    const domainValue = requestedDomain || '*';

    const existingProvider = await prisma.connectedProvider.findFirst({
      where: {
        userId: session.user.id,
        provider: 'resend',
        domain: domainValue,
      },
    });

    let providerId: string;

    if (existingProvider) {
      const updated = await prisma.connectedProvider.update({
        where: { id: existingProvider.id },
        data: {
          encryptedKey,
          status: 'connected',
          domain: domainValue,
        },
      });
      providerId = updated.id;
    } else {
      const created = await prisma.connectedProvider.create({
        data: {
          userId: session.user.id,
          provider: 'resend',
          domain: domainValue,
          encryptedKey,
          status: 'connected',
        },
      });
      providerId = created.id;
    }

    // Register EmailAddress rows for the domain(s) so routing is explicit
    const domainsToRegister =
      domainValue === '*'
        ? senderIdentities.map((s) => s.email.toLowerCase())
        : [domainValue];

    for (const d of domainsToRegister) {
      const existingAddr = await prisma.emailAddress.findUnique({ where: { email: `*@${d}` } });
      // Store a domain-level marker as localpart * for documentation; real routing uses domain match
      if (!existingAddr) {
        await prisma.emailAddress
          .create({
            data: {
              userId: session.user.id,
              email: `inbound@${d}`,
              domain: d,
              verified: true,
            },
          })
          .catch(() => {
            /* unique race */
          });
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

        // Best-effort: enable receiving capability on the domain(s)
        for (const identity of senderIdentities) {
          if (
            identity.domainId &&
            (domainValue === '*' || identity.email.toLowerCase() === domainValue)
          ) {
            await enableDomainReceiving(apiKey, identity.domainId);
          }
        }

        inboundNote =
          'Inbound webhook created. Enable receiving + add the MX record for your domain in the Resend dashboard so mail can be delivered.';
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
      senderIdentities: senderIdentities.map((s) => s.email),
      domain: domainValue,
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
