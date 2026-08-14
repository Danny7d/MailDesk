'use client';

import { motion } from 'framer-motion';

export default function Security() {
  const securityPoints = [
    {
      title: 'AES-256-GCM encryption',
      detail: 'API keys encrypted at rest using industry-standard encryption',
      code: 'encrypt(apiKey, ENCRYPTION_KEY)'
    },
    {
      title: 'Zero client-side exposure',
      detail: 'API keys never sent to browser, all operations server-side',
      code: 'POST /api/emails/send (server only)'
    },
    {
      title: 'User data isolation',
      detail: 'Multi-tenant architecture with per-user encryption keys',
      code: 'WHERE userId = session.user.id'
    },
    {
      title: 'Rate limiting',
      detail: 'Per-user rate limits to prevent abuse and protect reputation',
      code: 'max: 100 requests/minute'
    },
  ];

  return (
    <section id="security" className="py-32 bg-[#0C0C12] relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-green-600/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-blue-600/5 rounded-full blur-[120px]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:80px_80px]" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center max-w-3xl mx-auto mb-20"
        >
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6 leading-tight">
            Security & reliability
          </h2>
          <p className="text-base sm:text-lg text-white/60 max-w-xl mx-auto leading-relaxed">
            Your credentials are encrypted and never exposed. Built for teams who care about sending reputation.
          </p>
        </motion.div>

        {/* Security flow visualization */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="max-w-4xl mx-auto mb-20"
        >
          <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-0">
            {/* API key */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl px-6 py-4 text-center"
            >
              <div className="text-sm font-medium text-white">API Key</div>
              <div className="text-xs text-white/40 font-mono mt-1">re_xxxx...</div>
            </motion.div>
            
            <div className="hidden md:block text-green-500/50">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            </div>
            
            <div className="md:hidden text-green-500/50">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>

            {/* Encrypted */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="bg-gradient-to-br from-green-500/20 to-blue-500/20 backdrop-blur-sm border border-green-500/30 rounded-xl px-6 py-4 text-center relative"
            >
              <div className="absolute top-2 right-2">
                <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <div className="text-sm font-medium text-green-400">Encrypted</div>
              <div className="text-xs text-green-400/60 font-mono mt-1">AES-256-GCM</div>
            </motion.div>

            <div className="hidden md:block text-green-500/50">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            </div>

            <div className="md:hidden text-green-500/50">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>

            {/* Database */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.7 }}
              className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl px-6 py-4 text-center"
            >
              <div className="text-sm font-medium text-white">Database</div>
              <div className="text-xs text-white/40 font-mono mt-1">encryptedKey</div>
            </motion.div>
          </div>
        </motion.div>

        {/* Security points */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="max-w-3xl mx-auto"
        >
          <div className="grid md:grid-cols-2 gap-6">
            {securityPoints.map((point, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.5 + index * 0.1 }}
                className="bg-white/5 border border-white/10 rounded-xl p-6 backdrop-blur-sm"
              >
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-green-500/10 border border-green-500/20 rounded-lg flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-base font-semibold text-white mb-2">{point.title}</h3>
                    <p className="text-sm text-white/60 mb-3">{point.detail}</p>
                    <code className="text-xs text-green-400/80 bg-green-500/10 px-2 py-1 rounded font-mono">
                      {point.code}
                    </code>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
