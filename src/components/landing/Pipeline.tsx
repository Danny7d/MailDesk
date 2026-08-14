'use client';

import { motion } from 'framer-motion';

export default function Pipeline() {
  return (
    <section id="pipeline" className="py-32 bg-[#0C0C12] relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-600/5 rounded-full blur-[150px]" />
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
            How it connects
          </h2>
          <p className="text-base sm:text-lg text-white/60 max-w-xl mx-auto leading-relaxed">
            MailDesk is a thin layer on infrastructure you already use and trust.
          </p>
        </motion.div>

        {/* Pipeline visualization */}
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8 md:gap-4">
            {/* Resend Account */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="flex-1 text-center"
            >
              <div className="bg-white/ border border-white/10 rounded-2xl p-6 backdrop-blur-sm">
                <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl mx-auto mb-4 flex items-center justify-center">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Your Resend Account</h3>
                <p className="text-sm text-white/50">
                  <span className="font-mono text-xs">API Key</span> encrypted & stored
                </p>
              </div>
            </motion.div>

            {/* Arrow */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="hidden md:block"
            >
              <svg className="w-12 h-12 text-white/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </motion.div>

            {/* MailDesk */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="flex-1 text-center"
            >
              <div className="bg-gradient-to-br from-purple-600/20 to-blue-600/20 border border-purple-500/30 rounded-2xl p-6 backdrop-blur-sm">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-600 to-blue-600 rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-lg shadow-purple-500/30">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">MailDesk</h3>
                <p className="text-sm text-white/50">
                  Composer interface
                </p>
              </div>
            </motion.div>

            {/* Arrow */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="hidden md:block"
            >
              <svg className="w-12 h-12 text-white/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </motion.div>

            {/* Recipient */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="flex-1 text-center"
            >
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-sm">
                <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl mx-auto mb-4 flex items-center justify-center">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Recipient</h3>
                <p className="text-sm text-white/50">
                  Email delivered
                </p>
              </div>
            </motion.div>
          </div>

          {/* Technical details */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.5 }}
            className="mt-16 bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur-sm"
          >
            <h4 className="text-lg font-semibold text-white mb-6">Technical flow</h4>
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <span className="font-mono text-xs text-purple-400 bg-purple-500/10 px-2 py-1 rounded">1</span>
                <div className="flex-1">
                  <p className="text-sm text-white/80">Connect your Resend API key</p>
                  <p className="text-xs text-white/40 mt-1 font-mono">POST /api/providers/resend/connect</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <span className="font-mono text-xs text-purple-400 bg-purple-500/10 px-2 py-1 rounded">2</span>
                <div className="flex-1">
                  <p className="text-sm text-white/80">MailDesk validates key & retrieves domains</p>
                  <p className="text-xs text-white/40 mt-1 font-mono">resend.domains.list()</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <span className="font-mono text-xs text-purple-400 bg-purple-500/10 px-2 py-1 rounded">3</span>
                <div className="flex-1">
                  <p className="text-sm text-white/80">Compose email in MailDesk interface</p>
                  <p className="text-xs text-white/40 mt-1 font-mono">Select from verified domains</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <span className="font-mono text-xs text-purple-400 bg-purple-500/10 px-2 py-1 rounded">4</span>
                <div className="flex-1">
                  <p className="text-sm text-white/80">MailDesk sends via Resend API</p>
                  <p className="text-xs text-white/40 mt-1 font-mono">resend.emails.send()</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
