'use client';

import { useState, useEffect } from 'react';

export default function SettingsPage() {
  const [apiKey, setApiKey] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState(false);
  const [senderIdentities, setSenderIdentities] = useState<string[]>([]);

  // Check connection status on mount
  useEffect(() => {
    async function checkConnection() {
      try {
        const response = await fetch('/api/providers/resend/senders');
        if (response.ok) {
          const data = await response.json();
          if (data.senders && data.senders.length > 0) {
            setConnected(true);
            setSenderIdentities(data.senders);
          }
        }
      } catch {
        // Ignore error, assume not connected
      }
    }
    checkConnection();
  }, []);

  async function handleConnect() {
    setError('');
    setSuccess('');
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
        setLoading(false);
        return;
      }

      setConnected(true);
      setSenderIdentities(data.senderIdentities || []);
      setSuccess('Resend connected successfully!');
      setApiKey('');
    } catch {
      setError('Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  async function handleDisconnect() {
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/providers/resend/disconnect', {
        method: 'POST',
      });

      if (!response.ok) {
        setError('Failed to disconnect Resend');
        setLoading(false);
        return;
      }

      setConnected(false);
      setSenderIdentities([]);
      setSuccess('Resend disconnected successfully');
    } catch {
      setError('Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-2">Manage your email provider connections</p>
      </div>

      {/* Resend Connection */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Resend</h2>
        
        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-4">
            {success}
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {connected ? (
          <div>
            <div className="flex items-center mb-4">
              <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
              <span className="text-green-600 font-medium">Connected ✓</span>
            </div>
            
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">API key:</p>
              <div className="font-mono text-sm bg-gray-100 px-3 py-2 rounded">
                ••••••••••••••••
              </div>
            </div>

            {senderIdentities.length > 0 && (
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">Available sender identities:</p>
                <ul className="list-disc list-inside text-sm text-gray-700">
                  {senderIdentities.map((identity) => (
                    <li key={identity}>{identity}</li>
                  ))}
                </ul>
              </div>
            )}

            <button
              onClick={handleDisconnect}
              disabled={loading}
              className="bg-red-600 text-white hover:bg-red-700 px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Disconnecting...' : 'Disconnect'}
            </button>
          </div>
        ) : (
          <div>
            <p className="text-gray-600 mb-4">
              Connect your Resend account to start sending emails. Your API key will be encrypted and stored securely.
            </p>
            <div className="mb-4">
              <label htmlFor="apiKey" className="block text-sm font-medium text-gray-700 mb-2">
                Resend API Key
              </label>
              <input
                id="apiKey"
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="re_xxxxxxxxxxxxx"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Find your API key in the{' '}
                <a href="https://resend.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-700">
                  Resend dashboard
                </a>
              </p>
            </div>
            <button
              onClick={handleConnect}
              disabled={loading || !apiKey}
              className="bg-blue-600 text-white hover:bg-blue-700 px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Connecting...' : 'Connect Resend'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
