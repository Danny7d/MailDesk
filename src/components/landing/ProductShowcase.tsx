'use client';

import { motion } from 'framer-motion';

export default function ProductShowcase() {
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
                        <label className="block text-sm font-medium text-gray-700 mb-2">To</label>
                        <input
                          type="email"
                          value="customer@example.com"
                          readOnly
                          className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-900 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
                        <input
                          type="text"
                          value="Welcome to MailDesk"
                          readOnly
                          className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-900 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Message</label>
                        <textarea
                          value="Thank you for signing up..."
                          readOnly
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-900 text-sm resize-none"
                        />
                      </div>
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
