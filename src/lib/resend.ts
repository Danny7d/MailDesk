import { Resend } from 'resend';

export interface SenderIdentity {
  email: string;
  name?: string;
  domainId?: string;
  receivingEnabled?: boolean;
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface CreateInboundWebhookResult {
  success: boolean;
  webhookId?: string;
  signingSecret?: string;
  error?: string;
}

/**
 * Validates a Resend API key by making a test API call
 */
export async function validateResendApiKey(apiKey: string): Promise<boolean> {
  try {
    const resend = new Resend(apiKey);
    await resend.domains.list({ limit: 1 });
    return true;
  } catch (error) {
    console.error('Resend API key validation failed:', error);
    return false;
  }
}

/**
 * Retrieves available sender identities (domains) from the user's Resend account
 */
export async function getSenderIdentities(apiKey: string): Promise<SenderIdentity[]> {
  try {
    const resend = new Resend(apiKey);
    const senders: SenderIdentity[] = [];

    const { data: domainsResponse } = await resend.domains.list();
    if (domainsResponse && domainsResponse.data) {
      for (const domain of domainsResponse.data) {
        const receiving =
          (domain as { capabilities?: { receiving?: string } }).capabilities?.receiving ===
          'enabled';
        senders.push({
          email: domain.name,
          name: domain.name,
          domainId: domain.id,
          receivingEnabled: receiving,
        });
      }
    }

    return senders;
  } catch (error) {
    console.error('Failed to retrieve sender identities:', error);
    throw new Error('Failed to retrieve sender identities from Resend');
  }
}

/**
 * Create an email.received webhook in the user's Resend account.
 * Endpoint should be unique per connection, e.g. /api/webhooks/resend/{providerId}
 */
export async function createInboundWebhook(
  apiKey: string,
  endpoint: string
): Promise<CreateInboundWebhookResult> {
  try {
    const resend = new Resend(apiKey);
    const { data, error } = await resend.webhooks.create({
      endpoint,
      events: ['email.received'],
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: true,
      webhookId: data?.id,
      signingSecret: data?.signing_secret,
    };
  } catch (error) {
    console.error('Failed to create Resend webhook:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Delete a webhook from the user's Resend account (best-effort on disconnect).
 */
export async function deleteWebhook(
  apiKey: string,
  webhookId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.webhooks.remove(webhookId);
    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (error) {
    console.error('Failed to delete Resend webhook:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Try to enable receiving capability on a domain (user must still add MX records).
 */
export async function enableDomainReceiving(
  apiKey: string,
  domainId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.domains.update({
      id: domainId,
      capabilities: {
        receiving: 'enabled',
      },
    });
    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (error) {
    console.error('Failed to enable domain receiving:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Formats a plain text or HTML message into clean email HTML,
 * preserving paragraphs, line breaks, and spacing across all email clients.
 */
export function formatEmailHtml(message: string): string {
  if (!message) return '';

  if (/<!DOCTYPE|<html|<body/i.test(message)) {
    return message;
  }

  if (/<(p|br|div|table|h[1-6])\b/i.test(message)) {
    return `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 15px; line-height: 1.6; color: #111827;">${message}</div>`;
  }

  const normalized = message.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
  const paragraphs = normalized.split(/\n{2,}/);

  const formattedParagraphs = paragraphs
    .map((para) => para.trim())
    .filter((para) => para.length > 0)
    .map((para) => {
      const withBreaks = para.replace(/\n/g, '<br />');
      return `<p style="margin: 0 0 16px 0; margin-top: 0; line-height: 1.6;">${withBreaks}</p>`;
    });

  return `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 15px; line-height: 1.6; color: #111827;">${formattedParagraphs.join('')}</div>`;
}

/**
 * Sends an email using the Resend API
 */
export async function sendEmail(
  apiKey: string,
  from: string,
  to: string | string[],
  subject: string,
  html: string,
  text?: string
): Promise<SendEmailResult> {
  try {
    const resend = new Resend(apiKey);
    const formattedHtml = formatEmailHtml(html);
    const plainText = text || html;

    const { data, error } = await resend.emails.send({
      from,
      to: Array.isArray(to) ? to : [to],
      subject,
      html: formattedHtml,
      text: plainText,
    });

    if (error) {
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: true,
      messageId: data?.id,
    };
  } catch (error) {
    console.error('Failed to send email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Retrieves email status from Resend (if available)
 */
export async function getEmailStatus(
  apiKey: string,
  messageId: string
): Promise<{ status: string; error?: string }> {
  try {
    const resend = new Resend(apiKey);
    const { data, error } = await resend.emails.get(messageId);

    if (error) {
      return {
        status: 'failed',
        error: error.message,
      };
    }

    let status = 'sent';
    if (data?.last_event) {
      switch (data.last_event) {
        case 'delivered':
          status = 'delivered';
          break;
        case 'bounced':
          status = 'bounced';
          break;
        case 'complained':
          status = 'bounced';
          break;
        default:
          status = 'sent';
      }
    }

    return { status };
  } catch (error) {
    console.error('Failed to retrieve email status:', error);
    return {
      status: 'failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
