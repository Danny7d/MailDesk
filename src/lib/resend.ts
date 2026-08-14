import { Resend } from 'resend';

export interface SenderIdentity {
  email: string;
  name?: string;
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Validates a Resend API key by making a test API call
 */
export async function validateResendApiKey(apiKey: string): Promise<boolean> {
  try {
    const resend = new Resend(apiKey);
    // Try to retrieve domains to validate the key
    await resend.domains.list({ limit: 1 });
    return true;
  } catch (error) {
    console.error('Resend API key validation failed:', error);
    return false;
  }
}

/**
 * Retrieves available sender identities (domains and verified senders)
 * from the user's Resend account
 */
export async function getSenderIdentities(apiKey: string): Promise<SenderIdentity[]> {
  try {
    const resend = new Resend(apiKey);
    const senders: SenderIdentity[] = [];

    // Get verified domains
    const { data: domainsResponse } = await resend.domains.list();
    if (domainsResponse && domainsResponse.data) {
      for (const domain of domainsResponse.data) {
        // Resend allows sending from any email address at a verified domain
        // We return the domain name so users can construct their preferred sender
        // e.g., "info@example.com", "support@example.com", etc.
        senders.push({
          email: domain.name,
          name: domain.name,
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
 * Sends an email using the Resend API
 */
export async function sendEmail(
  apiKey: string,
  from: string,
  to: string | string[],
  subject: string,
  html: string
): Promise<SendEmailResult> {
  try {
    const resend = new Resend(apiKey);

    const { data, error } = await resend.emails.send({
      from,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
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

    // Map Resend status to our internal status
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
