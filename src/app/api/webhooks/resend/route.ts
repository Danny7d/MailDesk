import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { prisma } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    // Validate environment variables
    const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error('RESEND_WEBHOOK_SECRET is not configured');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
      console.error('RESEND_API_KEY is not configured');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    const resend = new Resend(resendApiKey);

    // Get raw request body for signature verification
    const payload = await request.text();

    // Verify webhook signature
    const svixId = request.headers.get('svix-id');
    const svixTimestamp = request.headers.get('svix-timestamp');
    const svixSignature = request.headers.get('svix-signature');

    if (!svixId || !svixTimestamp || !svixSignature) {
      console.error('Missing required webhook headers');
      return NextResponse.json(
        { error: 'Missing required headers' },
        { status: 400 }
      );
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
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      );
    }

    // Parse the verified payload
    const event = JSON.parse(payload);

    // Only process email.received events
    if (event.type !== 'email.received') {
      return NextResponse.json({ status: 'ignored' }, { status: 200 });
    }

    const eventData = event.data;

    // Check for idempotency using emailId
    const existingEmail = await prisma.incomingEmail.findUnique({
      where: { emailId: eventData.email_id },
    });

    if (existingEmail) {
      return NextResponse.json({ status: 'duplicate' }, { status: 200 });
    }

    // Collect all recipient candidates from to, cc, bcc
    const recipientCandidates: string[] = [];
    const addCandidates = (list: unknown) => {
      if (Array.isArray(list)) {
        for (const item of list) {
          if (typeof item === 'string') {
            const match = item.match(/<([^>]+)>/);
            const clean = (match && match[1] ? match[1] : item).toLowerCase().trim();
            if (clean && !recipientCandidates.includes(clean)) {
              recipientCandidates.push(clean);
            }
          }
        }
      } else if (typeof list === 'string') {
        const match = list.match(/<([^>]+)>/);
        const clean = (match && match[1] ? match[1] : list).toLowerCase().trim();
        if (clean && !recipientCandidates.includes(clean)) {
          recipientCandidates.push(clean);
        }
      }
    };

    addCandidates(eventData.to);
    addCandidates(eventData.cc);
    addCandidates(eventData.bcc);

    if (recipientCandidates.length === 0) {
      console.error('No recipient address in webhook payload');
      return NextResponse.json(
        { error: 'Invalid payload: missing recipient' },
        { status: 400 }
      );
    }

    // Route to user: check User table directly (logged-in email) or EmailAddress table
    let targetUserId: string | null = null;

    for (const recipientEmail of recipientCandidates) {
      // 1. Check User table directly by email (the logged-in email!)
      const user = await prisma.user.findUnique({
        where: { email: recipientEmail },
      });
      if (user) {
        targetUserId = user.id;
        break;
      }

      // 2. Check EmailAddress table
      const emailAddress = await prisma.emailAddress.findUnique({
        where: { email: recipientEmail },
      });
      if (emailAddress) {
        targetUserId = emailAddress.userId;
        break;
      }
    }

    if (!targetUserId) {
      console.error(`No user found for recipients: ${recipientCandidates.join(', ')}`);
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Retrieve full email content from Resend
    let emailContent: { text?: string | null; html?: string | null; headers?: Record<string, unknown> } = {};
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
      console.error('Failed to retrieve email content from Resend, using payload data:', retrieveError);
      emailContent = {
        text: eventData.text || null,
        html: eventData.html || null,
      };
    }

    // Create IncomingEmail record
    await prisma.incomingEmail.create({
      data: {
        userId: targetUserId,
        emailId: eventData.email_id,
        messageId: eventData.message_id || null,
        from: eventData.from,
        subject: eventData.subject || null,
        to: Array.isArray(eventData.to) ? eventData.to : [eventData.to],
        cc: Array.isArray(eventData.cc) ? eventData.cc : [],
        bcc: Array.isArray(eventData.bcc) ? eventData.bcc : [],
        textBody: emailContent.text || eventData.text || null,
        htmlBody: emailContent.html || eventData.html || null,
        headers: emailContent.headers ? JSON.parse(JSON.stringify(emailContent.headers)) : null,
        provider: 'resend',
        providerEventId: event.id || null,
        receivedAt: new Date(eventData.created_at || Date.now()),
      },
    });

    return NextResponse.json({ status: 'processed' }, { status: 200 });
  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json(
      { error: 'Processing failed' },
      { status: 500 }
    );
  }
}
