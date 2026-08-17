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

    // Route to user by recipient address
    const recipient = eventData.to[0];
    if (!recipient) {
      console.error('No recipient address in webhook payload');
      return NextResponse.json(
        { error: 'Invalid payload: missing recipient' },
        { status: 400 }
      );
    }

    // Normalize recipient address
    const normalizedRecipient = recipient.toLowerCase().trim();

    const emailAddress = await prisma.emailAddress.findUnique({
      where: { email: normalizedRecipient },
      include: { user: true },
    });

    if (!emailAddress) {
      console.error(`No user found for recipient: ${normalizedRecipient}`);
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Retrieve full email content from Resend
    let emailContent;
    try {
      const response = await resend.emails.receiving.get(eventData.email_id);
      if (response.error) {
        throw new Error(response.error.message);
      }
      emailContent = response.data;
    } catch (retrieveError) {
      console.error('Failed to retrieve email content from Resend:', retrieveError);
      return NextResponse.json(
        { error: 'Failed to retrieve email content' },
        { status: 500 }
      );
    }

    // Create IncomingEmail record
    await prisma.incomingEmail.create({
      data: {
        userId: emailAddress.userId,
        emailId: eventData.email_id,
        messageId: eventData.message_id,
        from: eventData.from,
        subject: eventData.subject,
        to: eventData.to,
        cc: eventData.cc || [],
        bcc: eventData.bcc || [],
        textBody: emailContent.text || null,
        htmlBody: emailContent.html || null,
        headers: emailContent.headers ? JSON.parse(JSON.stringify(emailContent.headers)) : null,
        provider: 'resend',
        providerEventId: event.id,
        receivedAt: new Date(eventData.created_at),
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
