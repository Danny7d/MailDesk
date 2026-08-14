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
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Resend</h2>
        
        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-4">
            <div className="flex items-center">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              {success}
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
            <div className="flex items-center">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              {error}
            </div>
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
              className="bg-red-600 text-white hover:bg-red-700 px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
            >
              {loading ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Disconnecting...
                </span>
              ) : (
                'Disconnect'
              )}
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
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-400 bg-white"
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
              className="bg-blue-600 text-white hover:bg-blue-700 px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              {loading ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Connecting...
                </span>
              ) : (
                'Connect Resend'
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
