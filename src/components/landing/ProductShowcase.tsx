'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function ProductShowcase() {
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'success'>('idle');
  const [senderPrefix, setSenderPrefix] = useState('info');
  const [selectedDomain, setSelectedDomain] = useState('example.com');

  const sender = `${senderPrefix}@${selectedDomain}`;

  const handleSend = () => {
    if (!sender || !to || !subject || !message) return;
    setStatus('sending');
    
    // Simulate sending delay
    setTimeout(() => {
      setStatus('success');
    }, 2000);
  };

  const handleReset = () => {
    setTo('');
    setSubject('');
    setMessage('');
    setStatus('idle');
  };

  const features = [
    {
      id: 'compose',
      title: 'Compose',
      description: 'Write it like an email. Compose emails through a familiar interface without writing code.',
      reverse: false,
    },
    {
      id: 'sender',
      title: 'Choose your sender',
      description: 'Select from your verified domains and sender identities. Full control over your email appearance.',
      reverse: true,
    },
    {
      id: 'history',
      title: 'Track what you\'ve sent',
      description: 'View your email history with delivery status. Know exactly what was sent and when.',
      reverse: false,
    },
  ];

  return (
    <section className="py-32 bg-gradient-to-br from-gray-50 to-white relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-3xl mx-auto mb-24"
        >
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
            See MailDesk in action
          </h2>
          <p className="text-xl text-gray-600">
            A powerful workspace designed for sending emails without the complexity.
          </p>
        </motion.div>

        {features.map((feature, index) => (
          <motion.div
            key={feature.id}
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: index * 0.2 }}
            className={`flex flex-col lg:flex-row items-center gap-16 mb-32 ${
              feature.reverse ? 'lg:flex-row-reverse' : ''
            }`}
          >
            {/* Product visualization */}
            <div className="flex-1 w-full">
              <div className="bg-white rounded-2xl border border-gray-200 shadow-2xl overflow-hidden">
                <div className="bg-gray-100 border-b border-gray-200 px-4 py-3 flex items-center gap-2">
                  <div className="flex gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-400" />
                    <div className="w-3 h-3 rounded-full bg-yellow-400" />
                    <div className="w-3 h-3 rounded-full bg-green-400" />
                  </div>
                  <div className="flex-1 flex justify-center">
                    <div className="bg-white rounded-md px-4 py-1 text-xs text-gray-500 font-medium">
                      MailDesk
                    </div>
                  </div>
                </div>
                <div className="p-6 bg-gray-50 min-h-[300px]">
                  {feature.id === 'compose' && (
                    <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
                      <div className="border-b border-gray-200 pb-4">
                        <h3 className="text-lg font-semibold text-gray-900">Compose Email</h3>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">From</label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={senderPrefix}
                            onChange={(e) => setSenderPrefix(e.target.value)}
                            placeholder="info"
                            disabled={status !== 'idle'}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                          <span className="flex items-center text-gray-500">@</span>
                          <select
                            value={selectedDomain}
                            onChange={(e) => setSelectedDomain(e.target.value)}
                            disabled={status !== 'idle'}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          >
                            <option value="example.com">example.com</option>
                            <option value="yourdomain.com">yourdomain.com</option>
                          </select>
                        </div>
                        {sender && (
                          <p className="text-xs text-gray-500 mt-1">
                            Email will be sent from: <strong>{sender}</strong>
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">To</label>
                        <input
                          type="email"
                          value={to}
                          onChange={(e) => setTo(e.target.value)}
                          placeholder="customer@example.com"
                          disabled={status !== 'idle'}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
                        <input
                          type="text"
                          value={subject}
                          onChange={(e) => setSubject(e.target.value)}
                          placeholder="Welcome to MailDesk"
                          disabled={status !== 'idle'}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Message</label>
                        <textarea
                          value={message}
                          onChange={(e) => setMessage(e.target.value)}
                          placeholder="Thank you for signing up..."
                          rows={3}
                          disabled={status !== 'idle'}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      <AnimatePresence mode="wait">
                        {status === 'idle' && (
                          <motion.button
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={handleSend}
                            disabled={!to || !subject || !message}
                            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                          >
                            Send Email
                          </motion.button>
                        )}
                        {status === 'sending' && (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="w-full bg-gray-100 border border-gray-200 text-gray-700 px-4 py-2 rounded-md text-sm font-medium flex items-center justify-center gap-2"
                          >
                            <motion.div
                              animate={{ rotate: 360 }}
                              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                              </svg>
                            </motion.div>
                            Sending...
                          </motion.div>
                        )}
                        {status === 'success' && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0 }}
                            className="w-full bg-green-50 border border-green-200 text-green-700 px-4 py-2 rounded-md text-sm font-medium flex items-center justify-center gap-2"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Email sent successfully
                          </motion.div>
                        )}
                      </AnimatePresence>
                      {status === 'success' && (
                        <motion.button
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          onClick={handleReset}
                          className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-md text-sm font-medium transition-colors"
                        >
                          Send another
                        </motion.button>
                      )}
                      <p className="text-xs text-gray-500 text-center">
                        This is a marketing demo. No email will actually be sent.
                      </p>
                    </div>
                  )}
                  {feature.id === 'sender' && (
                    <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
                      <div className="border-b border-gray-200 pb-4">
                        <h3 className="text-lg font-semibold text-gray-900">Select Sender</h3>
                      </div>
                      <div className="space-y-3">
                        <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                          <div className="w-4 h-4 bg-blue-600 rounded-full" />
                          <span className="text-sm font-medium text-gray-900">info@example.com</span>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                          <div className="w-4 h-4 border-2 border-gray-300 rounded-full" />
                          <span className="text-sm text-gray-600">support@example.com</span>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                          <div className="w-4 h-4 border-2 border-gray-300 rounded-full" />
                          <span className="text-sm text-gray-600">noreply@example.com</span>
                        </div>
                      </div>
                    </div>
                  )}
                  {feature.id === 'history' && (
                    <div className="bg-white rounded-lg border border-gray-200 p-6">
                      <div className="border-b border-gray-200 pb-4 mb-4">
                        <h3 className="text-lg font-semibold text-gray-900">Sent Emails</h3>
                      </div>
                      <div className="space-y-3">
                        {[
                          { to: 'customer@example.com', subject: 'Welcome to MailDesk', status: 'Delivered' },
                          { to: 'user@test.com', subject: 'Your account is ready', status: 'Delivered' },
                          { to: 'team@company.com', subject: 'Project update', status: 'Delivered' },
                        ].map((email, i) => (
                          <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex-1">
                              <div className="text-sm font-medium text-gray-900">{email.subject}</div>
                              <div className="text-xs text-gray-500">{email.to}</div>
                            </div>
                            <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">
                              {email.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Text content */}
            <div className="flex-1">
              <h3 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-6">
                {feature.title}
              </h3>
              <p className="text-xl text-gray-600 leading-relaxed">
                {feature.description}
              </p>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
