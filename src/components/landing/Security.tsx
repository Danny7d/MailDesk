'use client';

import { motion } from 'framer-motion';

export default function Security() {
  const securityPoints = [
    'AES-256-GCM encryption at rest',
    'API keys never exposed to the browser',
    'User-level data isolation',
    'Rate limiting against abuse',
  ];

  return (
    <section id="security" className="py-24 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-green-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
      
      {/* Grid pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:64px_64px]" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-2xl mx-auto mb-16"
        >
          <h2 className="text-4xl sm:text-5xl font-bold text-white mb-4">
            Your credentials stay yours
          </h2>
          <p className="text-lg text-gray-300">
            MailDesk is designed to act as a secure interface between you and your email provider. Your Resend credentials are protected server-side and are never exposed to the browser.
          </p>
        </motion.div>

        {/* Security flow visualization */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="max-w-4xl mx-auto mb-16"
        >
          <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-0">
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl px-6 py-4 text-center">
              <div className="text-sm font-medium text-white">Your Resend account</div>
            </div>
            
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

            <div className="bg-gradient-to-br from-green-500/20 to-blue-500/20 backdrop-blur-sm border border-green-500/30 rounded-xl px-6 py-4 text-center">
              <div className="text-sm font-medium text-green-400">Encrypted key</div>
            </div>

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

            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl px-6 py-4 text-center">
              <div className="text-sm font-medium text-white">MailDesk</div>
            </div>

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

            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl px-6 py-4 text-center">
              <div className="text-sm font-medium text-white">Resend</div>
            </div>
          </div>
        </motion.div>

        {/* Security points */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="max-w-2xl mx-auto"
        >
          <ul className="space-y-4">
            {securityPoints.map((point, index) => (
              <motion.li
                key={index}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: 0.5 + index * 0.1 }}
                className="flex items-start"
              >
                <svg className="w-5 h-5 text-green-400 mr-3 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-gray-300">{point}</span>
              </motion.li>
            ))}
          </ul>
        </motion.div>
      </div>
    </section>
  );
}
