'use client';

import { useEffect, useState } from 'react';

type ResendConnection = {
  domain: string;
  legacy: boolean;
  senders: string[];
  inboundEnabled?: boolean;
  providerId?: string;
};

export default function SettingsPage() {
  const [apiKey, setApiKey] = useState('');
  const [connections, setConnections] = useState<ResendConnection[]>([]);
  const [senderIdentities, setSenderIdentities] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [inboundNote, setInboundNote] = useState('');
  const [loading, setLoading] = useState(false);

  async function refreshConnections() {
    const response = await fetch('/api/providers/resend/senders', { cache: 'no-store' });
    if (!response.ok) return;
    const data = await response.json();
    setConnections(data.connections || []);
    setSenderIdentities(data.senders || []);
  }

  useEffect(() => {
    void refreshConnections().catch(() => {
      setError('Could not load your saved Resend connections.');
    });
  }, []);

  async function handleConnect(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setSuccess('');
    setInboundNote('');
    setLoading(true);

    try {
      const response = await fetch('/api/providers/resend/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to connect Resend');
        return;
      }

      await refreshConnections();
      setApiKey('');
      const domains: string[] = data.senderIdentities || [];
      setSuccess(
        domains.length > 0
          ? `Resend connected. Domains found: ${domains.join(', ')}. Pick the From domain when you compose.`
          : 'Resend key saved.'
      );
      if (data.inboundNote) setInboundNote(data.inboundNote);
    } catch {
      setError('Something went wrong while saving the Resend key.');
    } finally {
      setLoading(false);
    }
  }

  async function handleDisconnect() {
    setError('');
    setSuccess('');
    setInboundNote('');
    setLoading(true);

    try {
      const response = await fetch('/api/providers/resend/disconnect', { method: 'POST' });
      if (!response.ok) {
        setError('Failed to disconnect Resend');
        return;
      }

      setConnections([]);
      setSenderIdentities([]);
      setSuccess('Resend was disconnected.');
    } catch {
      setError('Something went wrong while disconnecting Resend.');
    } finally {
      setLoading(false);
    }
  }

  const isConnected = connections.length > 0;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-2">
          Connect your Resend API key. Domains are detected automatically — choose From on the compose page.
        </p>
      </div>

      <section className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Resend connection</h2>

        {success && (
          <p role="status" className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-green-700">
            {success}
          </p>
        )}
        {inboundNote && (
          <p role="status" className="mb-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-blue-800 text-sm">
            {inboundNote}
          </p>
        )}
        {error && (
          <p role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700">
            {error}
          </p>
        )}

        {isConnected ? (
          <div className="mb-6">
            <div className="rounded-lg border border-gray-200 px-4 py-3">
              <p className="font-medium text-gray-900">Connected</p>
              <p className="text-sm text-gray-500 mt-1">
                {connections.some((c) => c.inboundEnabled)
                  ? 'Inbound webhook active · '
                  : ''}
                Domains from your key:
              </p>
              {senderIdentities.length > 0 ? (
                <ul className="mt-2 flex flex-wrap gap-2">
                  {senderIdentities.map((d) => (
                    <li
                      key={d}
                      className="rounded-full bg-gray-100 px-3 py-1 text-sm font-mono text-gray-800"
                    >
                      {d}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-1 text-sm text-gray-500">No domains returned for this key.</p>
              )}
            </div>
            <button
              type="button"
              onClick={handleDisconnect}
              disabled={loading}
              className="mt-4 rounded-md px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
            >
              Disconnect Resend
            </button>
          </div>
        ) : (
          <p className="mb-6 text-sm text-gray-600">No Resend key is saved yet.</p>
        )}

        <form onSubmit={handleConnect} className="border-t border-gray-200 pt-6">
          <h3 className="text-base font-semibold text-gray-900">
            {isConnected ? 'Replace API key' : 'Connect Resend'}
          </h3>
          <p className="mt-1 mb-4 text-sm text-gray-600">
            Paste your key only. We load every verified domain from Resend. Pick which domain to send
            from on the <strong>Compose</strong> page.
          </p>

          <label htmlFor="apiKey" className="mb-2 block text-sm font-medium text-gray-700">
            Resend API key
          </label>
          <input
            id="apiKey"
            type="password"
            required
            value={apiKey}
            onChange={(event) => setApiKey(event.target.value)}
            placeholder="re_xxxxxxxxxxxxx"
            autoComplete="new-password"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="mt-1 text-xs text-gray-500">
            Create keys in the{' '}
            <a
              href="https://resend.com/api-keys"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-700"
            >
              Resend API keys page
            </a>
            . Domains must already be added under{' '}
            <a
              href="https://resend.com/domains"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-700"
            >
              Domains
            </a>
            .
          </p>
          <button
            type="submit"
            disabled={loading || !apiKey.trim()}
            className="mt-4 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? 'Connecting…' : isConnected ? 'Replace key' : 'Connect Resend'}
          </button>
        </form>
      </section>

      <section className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Receiving setup (once per domain)</h2>
        <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
          <li>
            In{' '}
            <a
              href="https://resend.com/domains"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              Resend → Domains
            </a>
            , open each domain and enable <strong>Receiving</strong>.
          </li>
          <li>Add the MX record Resend shows and wait until it is verified.</li>
          <li>
            After you connect the key above, MailDesk creates the{' '}
            <code className="text-xs bg-gray-100 px-1 rounded">email.received</code> webhook
            (requires <code className="text-xs bg-gray-100 px-1 rounded">NEXT_PUBLIC_APP_URL</code> as
            https).
          </li>
          <li>
            Send a test to <span className="font-mono">anything@your-domain.com</span> — it should
            appear in Inbox.
          </li>
        </ol>
        <p className="mt-3 text-xs text-gray-500">
          Only domains verified for receiving in your Resend account work. Gmail/Outlook addresses
          cannot receive through MailDesk.
        </p>
      </section>
    </div>
  );
}
