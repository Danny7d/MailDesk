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
    <section className="py-40 bg-[#101018] relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-blue-600/5 rounded-full blur-[150px]" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-purple-600/5 rounded-full blur-[150px]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:80px_80px]" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center max-w-3xl mx-auto mb-24"
        >
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6 leading-tight">
            See MailDesk in action
          </h2>
          <p className="text-base sm:text-lg text-white/60 max-w-xl mx-auto leading-relaxed">
            A powerful workspace designed for sending emails without the complexity.
          </p>
        </motion.div>

        {features.map((feature, index) => (
          <motion.div
            key={feature.id}
            initial={{ opacity: 0, y: 60 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: index * 0.2 }}
            className={`flex flex-col lg:flex-row items-center gap-16 mb-40 ${
              feature.reverse ? 'lg:flex-row-reverse' : ''
            }`}
          >
            {/* Product visualization */}
            <div className="flex-1 w-full">
              <div className="bg-[#0C0C12] rounded-3xl border border-white/10 shadow-2xl overflow-hidden backdrop-blur-sm">
                <div className="bg-white/5 border-b border-white/10 px-6 py-4 flex items-center gap-3">
                  <div className="flex gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500/60" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
                    <div className="w-3 h-3 rounded-full bg-green-500/60" />
                  </div>
                  <div className="flex-1 flex justify-center">
                    <div className="bg-white/10 rounded-lg px-5 py-2 text-xs text-white/70 font-medium backdrop-blur-sm">
                      MailDesk
                    </div>
                  </div>
                </div>
                <div className="p-8 bg-[#08080B] min-h-[350px]">
                  {feature.id === 'compose' && (
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-5 backdrop-blur-sm">
                      <div className="border-b border-white/10 pb-5">
                        <h3 className="text-xl font-semibold text-white">Compose Email</h3>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-white/70 mb-3">From</label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value="info"
                            disabled
                            className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm opacity-50"
                          />
                          <span className="flex items-center text-white/40">@</span>
                          <select
                            value="example.com"
                            disabled
                            className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm opacity-50"
                          >
                            <option value="example.com">example.com</option>
                          </select>
                        </div>
                        <p className="text-xs text-white/40 mt-2">
                          Email will be sent from: <span className="font-mono text-white/60">info@example.com</span>
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-white/70 mb-3">To</label>
                        <input
                          type="email"
                          value="customer@example.com"
                          disabled
                          className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm opacity-50"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-white/70 mb-3">Subject</label>
                        <input
                          type="text"
                          value="Welcome to MailDesk"
                          disabled
                          className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm opacity-50"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-white/70 mb-3">Message</label>
                        <textarea
                          value="Thank you for signing up..."
                          rows={3}
                          disabled
                          className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm resize-none opacity-50"
                        />
                      </div>
                      <button
                        disabled
                        className="w-full bg-gradient-to-r from-purple-600/50 to-blue-600/50 text-white/50 px-5 py-3 rounded-xl text-sm font-semibold border border-white/10 cursor-not-allowed"
                      >
                        Send Email
                      </button>
                    </div>
                  )}
                  {feature.id === 'sender' && (
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4 backdrop-blur-sm">
                      <div className="border-b border-white/10 pb-5">
                        <h3 className="text-xl font-semibold text-white">Select Sender</h3>
                      </div>
                      <div className="space-y-3">
                        <div className="flex items-center gap-4 p-4 bg-purple-500/10 border border-purple-500/30 rounded-2xl backdrop-blur-sm">
                          <div className="w-5 h-5 bg-purple-500 rounded-full shadow-lg shadow-purple-500/50" />
                          <span className="text-sm font-medium text-white">info@example.com</span>
                        </div>
                        <div className="flex items-center gap-4 p-4 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-sm">
                          <div className="w-5 h-5 border-2 border-white/20 rounded-full" />
                          <span className="text-sm text-white/60">support@example.com</span>
                        </div>
                        <div className="flex items-center gap-4 p-4 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-sm">
                          <div className="w-5 h-5 border-2 border-white/20 rounded-full" />
                          <span className="text-sm text-white/60">noreply@example.com</span>
                        </div>
                      </div>
                    </div>
                  )}
                  {feature.id === 'history' && (
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-sm">
                      <div className="border-b border-white/10 pb-5 mb-5">
                        <h3 className="text-xl font-semibold text-white">Sent Emails</h3>
                      </div>
                      <div className="space-y-3">
                        {[
                          { to: 'customer@example.com', subject: 'Welcome to MailDesk', status: 'Delivered' },
                          { to: 'user@test.com', subject: 'Your account is ready', status: 'Delivered' },
                          { to: 'team@company.com', subject: 'Project update', status: 'Delivered' },
                        ].map((email, i) => (
                          <div key={i} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5 backdrop-blur-sm">
                            <div className="flex-1">
                              <div className="text-sm font-medium text-white">{email.subject}</div>
                              <div className="text-xs text-white/40">{email.to}</div>
                            </div>
                            <span className="text-xs text-green-400 bg-green-500/10 border border-green-500/20 px-3 py-1.5 rounded-full">
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
              <h3 className="text-2xl sm:text-3xl font-bold text-white mb-6 leading-tight">
                {feature.title}
              </h3>
              <p className="text-base text-white/60 leading-relaxed">
                {feature.description}
              </p>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
