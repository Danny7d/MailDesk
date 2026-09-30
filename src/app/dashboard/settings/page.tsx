'use client';

import { useEffect, useState } from 'react';

type ResendConnection = {
  domain: string;
  legacy: boolean;
  senders: string[];
};

export default function SettingsPage() {
  const [apiKey, setApiKey] = useState('');
  const [domain, setDomain] = useState('');
  const [connections, setConnections] = useState<ResendConnection[]>([]);
  const [senderIdentities, setSenderIdentities] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
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
    setLoading(true);

    try {
      const response = await fetch('/api/providers/resend/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey, domain }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to connect Resend');
        return;
      }

      await refreshConnections();
      setApiKey('');
      setDomain('');
      setSuccess(`Resend key saved for ${data.domain}.`);
    } catch {
      setError('Something went wrong while saving the Resend key.');
    } finally {
      setLoading(false);
    }
  }

  async function handleDisconnect() {
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const response = await fetch('/api/providers/resend/disconnect', { method: 'POST' });
      if (!response.ok) {
        setError('Failed to disconnect Resend');
        return;
      }

      setConnections([]);
      setSenderIdentities([]);
      setSuccess('All Resend keys were removed.');
    } catch {
      setError('Something went wrong while disconnecting Resend.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-2">Manage your saved Resend API keys by sending domain.</p>
      </div>

      <section className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Resend connections</h2>

        {success && <p role="status" className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-green-700">{success}</p>}
        {error && <p role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700">{error}</p>}

        {connections.length > 0 ? (
          <div className="mb-6">
            <h3 className="mb-2 text-sm font-medium text-gray-700">Saved keys</h3>
            <ul className="divide-y divide-gray-200 rounded-lg border border-gray-200">
              {connections.map((connection, index) => (
                <li key={`${connection.domain}-${index}`} className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <span className="font-medium text-gray-900">
                    {connection.legacy ? 'Legacy account-wide key' : connection.domain}
                  </span>
                  <span className="text-sm text-gray-500">
                    {connection.legacy
                      ? `Fallback for ${connection.senders.join(', ') || 'available domains'}`
                      : 'Encrypted key saved'}
                  </span>
                </li>
              ))}
            </ul>
            {senderIdentities.length > 0 && (
              <p className="mt-2 text-xs text-gray-500">Available send-from domains: {senderIdentities.join(', ')}</p>
            )}
            <button
              type="button"
              onClick={handleDisconnect}
              disabled={loading}
              className="mt-4 rounded-md px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
            >
              Remove all Resend keys
            </button>
          </div>
        ) : (
          <p className="mb-6 text-sm text-gray-600">No Resend key is saved yet.</p>
        )}

        <form onSubmit={handleConnect} className="border-t border-gray-200 pt-6">
          <h3 className="text-base font-semibold text-gray-900">Add or replace a domain key</h3>
          <p className="mt-1 mb-4 text-sm text-gray-600">
            Keys are encrypted and saved to your account. Saving another key for the same domain replaces that domain&apos;s key.
          </p>

          <label htmlFor="domain" className="mb-2 block text-sm font-medium text-gray-700">Sending domain</label>
          <input
            id="domain"
            type="text"
            required
            value={domain}
            onChange={(event) => setDomain(event.target.value)}
            placeholder="example.com"
            autoComplete="off"
            className="mb-4 w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          <label htmlFor="apiKey" className="mb-2 block text-sm font-medium text-gray-700">Resend API key</label>
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
            The domain must be available to this key in your{' '}
            <a href="https://resend.com/domains" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-700">Resend account</a>.
            {' '}Create keys in the <a href="https://resend.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-700">API keys page</a>.
          </p>
          <button
            type="submit"
            disabled={loading || !apiKey.trim() || !domain.trim()}
            className="mt-4 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? 'Saving key…' : 'Save key for domain'}
          </button>
        </form>
      </section>
    </div>
  );
}
