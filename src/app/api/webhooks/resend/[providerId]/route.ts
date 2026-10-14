import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { prisma } from '@/lib/db';
import { decrypt, validateEncryptionSecret } from '@/lib/encryption';

function extractEmails(list: unknown): string[] {
  const out: string[] = [];
  const add = (item: unknown) => {
    if (typeof item !== 'string') return;
    const match = item.match(/<([^>]+)>/);
    const clean = (match?.[1] ?? item).toLowerCase().trim();
    if (clean && !out.includes(clean)) out.push(clean);
  };
  if (Array.isArray(list)) {
    for (const item of list) add(item);
  } else {
    add(list);
  }
  return out;
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ providerId: string }> }
) {
  try {
    const { providerId } = await context.params;

    const provider = await prisma.connectedProvider.findUnique({
      where: { id: providerId },
    });

    if (!provider || provider.provider !== 'resend' || provider.status !== 'connected') {
      return NextResponse.json({ error: 'Unknown connection' }, { status: 404 });
    }

    if (!provider.encryptedWebhookSecret) {
      console.error('Provider has no webhook secret:', providerId);
      return NextResponse.json({ error: 'Inbound not configured' }, { status: 400 });
    }

    const encryptionSecret = process.env.ENCRYPTION_KEY;
    if (!validateEncryptionSecret(encryptionSecret)) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const webhookSecret = decrypt(provider.encryptedWebhookSecret, encryptionSecret!);
    const apiKey = decrypt(provider.encryptedKey, encryptionSecret!);
    const resend = new Resend(apiKey);

    const payload = await request.text();

    const svixId = request.headers.get('svix-id');
    const svixTimestamp = request.headers.get('svix-timestamp');
    const svixSignature = request.headers.get('svix-signature');

    if (!svixId || !svixTimestamp || !svixSignature) {
      return NextResponse.json({ error: 'Missing required headers' }, { status: 400 });
    }

    try {
      resend.webhooks.verify({
        payload,
        headers: {
          id: svixId,
          timestamp: svixTimestamp,
          signature: svixSignature,
        },
        webhookSecret,
      });
    } catch (verificationError) {
      console.error('Webhook signature verification failed:', verificationError);
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    const event = JSON.parse(payload);

    if (event.type !== 'email.received') {
      return NextResponse.json({ status: 'ignored' }, { status: 200 });
    }

    const eventData = event.data;

    const existingEmail = await prisma.incomingEmail.findUnique({
      where: { emailId: eventData.email_id },
    });
    if (existingEmail) {
      return NextResponse.json({ status: 'duplicate' }, { status: 200 });
    }

    const recipientCandidates = [
      ...extractEmails(eventData.to),
      ...extractEmails(eventData.cc),
      ...extractEmails(eventData.bcc),
      ...extractEmails(eventData.received_for),
    ];

    if (recipientCandidates.length === 0) {
      return NextResponse.json({ error: 'Invalid payload: missing recipient' }, { status: 400 });
    }

    // Ensure at least one recipient belongs to this connection's domain (or * = any)
    const connectionDomain = provider.domain.toLowerCase();
    if (connectionDomain !== '*') {
      const matchesDomain = recipientCandidates.some((addr) => {
        const domainPart = addr.split('@')[1];
        return domainPart === connectionDomain;
      });
      if (!matchesDomain) {
        // Still accept — webhook is already scoped to this Resend account;
        // domain filter is soft so multi-domain keys still work.
        console.warn(
          `Inbound recipients ${recipientCandidates.join(', ')} do not match connection domain ${connectionDomain}`
        );
      }
    }

    let emailContent: {
      text?: string | null;
      html?: string | null;
      headers?: Record<string, unknown>;
    } = {};

    try {
      const response = await resend.emails.receiving.get(eventData.email_id);
      if (response.error) {
        throw new Error(response.error.message);
      }
      emailContent = {
        text: response.data?.text || null,
        html: response.data?.html || null,
        headers: response.data?.headers || undefined,
      };
    } catch (retrieveError) {
      console.error('Failed to retrieve email content from Resend:', retrieveError);
      emailContent = {
        text: eventData.text || null,
        html: eventData.html || null,
      };
    }

    await prisma.incomingEmail.create({
      data: {
        userId: provider.userId,
        emailId: eventData.email_id,
        messageId: eventData.message_id || null,
        from: eventData.from,
        subject: eventData.subject || null,
        to: Array.isArray(eventData.to) ? eventData.to : [eventData.to].filter(Boolean),
        cc: Array.isArray(eventData.cc) ? eventData.cc : [],
        bcc: Array.isArray(eventData.bcc) ? eventData.bcc : [],
        textBody: emailContent.text || eventData.text || null,
        htmlBody: emailContent.html || eventData.html || null,
        headers: emailContent.headers
          ? JSON.parse(JSON.stringify(emailContent.headers))
          : null,
        provider: 'resend',
        providerEventId: event.id || null,
        receivedAt: new Date(eventData.created_at || Date.now()),
      },
    });

    return NextResponse.json({ status: 'processed' }, { status: 200 });
  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 });
  }
}
