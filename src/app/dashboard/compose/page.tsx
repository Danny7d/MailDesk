'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ComposePage() {
  const router = useRouter();
  const [recipient, setRecipient] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [senderIdentities, setSenderIdentities] = useState<string[]>([]);
  const [selectedDomain, setSelectedDomain] = useState('');
  const [senderPrefix, setSenderPrefix] = useState('info');

  // Fetch sender identities on mount
  useEffect(() => {
    async function fetchSenderIdentities() {
      try {
        const response = await fetch('/api/providers/resend/senders');
        if (response.ok) {
          const data = await response.json();
          setSenderIdentities(data.senders || []);
          if (data.senders && data.senders.length > 0) {
            setSelectedDomain(data.senders[0]);
          }
        }
      } catch {
        console.error('Failed to fetch sender identities');
      }
    }
    fetchSenderIdentities();
  }, []);

  // Compute sender address from domain and prefix
  const sender = selectedDomain ? `${senderPrefix}@${selectedDomain}` : '';

  async function handleSend() {
    setError('');
    setSuccess('');
    setLoading(true);

    if (!sender || !recipient || !subject || !message) {
      setError('Please fill in all fields');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/emails/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender,
          recipient,
          subject,
          message,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to send email');
        setLoading(false);
        return;
      }

      setSuccess('Email sent successfully!');

      // Clear form
      setRecipient('');
      setSubject('');
      setMessage('');

      // Redirect to sent page after a delay
      setTimeout(() => {
        router.push('/dashboard/sent');
      }, 1500);
    } catch {
      setError('Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Compose Email</h1>
        <p className="text-gray-600 mt-2">Send a new email through your connected Resend account</p>
      </div>

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-6">
          <div className="flex items-center">
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            {success}
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          <div className="flex items-center">
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            {error}
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="p-6 space-y-6">
          {/* From */}
          <div>
            <label htmlFor="sender" className="block text-sm font-medium text-gray-700 mb-2">
              From
            </label>
            {senderIdentities.length === 0 ? (
              <div className="text-sm text-gray-600">
                No sender identities available. Please{' '}
                <a href="/dashboard/settings" className="text-blue-600 hover:text-blue-700">
                  connect your Resend account
                </a>
                .
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  id="senderPrefix"
                  type="text"
                  value={senderPrefix}
                  onChange={(e) => setSenderPrefix(e.target.value)}
                  placeholder="info"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-400 bg-white"
                />
                <span className="flex items-center text-gray-500">@</span>
                <select
                  id="domain"
                  value={selectedDomain}
                  onChange={(e) => setSelectedDomain(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                >
                  {senderIdentities.map((domain) => (
                    <option key={domain} value={domain}>
                      {domain}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {sender && (
              <p className="text-xs text-gray-500 mt-1">
                Email will be sent from: <strong>{sender}</strong>
              </p>
            )}
          </div>

          {/* To */}
          <div>
            <label htmlFor="recipient" className="block text-sm font-medium text-gray-700 mb-2">
              To
            </label>
            <input
              id="recipient"
              type="email"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="recipient@example.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-400 bg-white"
            />
          </div>

          {/* Subject */}
          <div>
            <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-2">
              Subject
            </label>
            <input
              id="subject"
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Email subject"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-400 bg-white"
            />
          </div>

          {/* Message */}
          <div>
            <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
              Message
            </label>
            <textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Write your message here..."
              rows={12}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-400 bg-white resize-y"
            />
            <p className="text-xs text-gray-500 mt-1">
              Basic HTML formatting is supported (bold, italic, links, lists)
            </p>
          </div>

          {/* Send Button */}
          <div className="flex justify-end pt-4">
            <button
              onClick={handleSend}
              disabled={loading || !senderIdentities.length}
              className="bg-blue-600 text-white hover:bg-blue-700 px-6 py-2.5 rounded-md text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              {loading ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Sending...
                </span>
              ) : (
                'Send Email'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
