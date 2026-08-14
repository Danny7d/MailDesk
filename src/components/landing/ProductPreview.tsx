'use client';

import { motion } from 'framer-motion';

export default function ProductPreview() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 50, rotateX: 10 }}
      animate={{ opacity: 1, y: 0, rotateX: 0 }}
      transition={{ duration: 1, delay: 0.8 }}
      className="w-full max-w-5xl mx-auto perspective-1000"
      style={{ perspective: '1000px' }}
    >
      <motion.div
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        className="relative"
        style={{ transformStyle: 'preserve-3d' }}
      >
        {/* Glow effect behind */}
        <div className="absolute -inset-4 bg-gradient-to-r from-blue-500/30 to-purple-500/30 rounded-2xl blur-2xl -z-10" />
        
        {/* Browser window */}
        <div className="rounded-xl border border-white/20 bg-white/10 backdrop-blur-xl shadow-2xl overflow-hidden">
          {/* Browser window header */}
          <div className="bg-white/5 border-b border-white/10 px-4 py-3 flex items-center gap-2">
            <div className="flex gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500/80" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
              <div className="w-3 h-3 rounded-full bg-green-500/80" />
            </div>
            <div className="flex-1 flex justify-center">
              <div className="bg-white/10 backdrop-blur-sm rounded-md px-4 py-1 text-xs text-white/70 font-medium border border-white/10">
                MailDesk
              </div>
            </div>
          </div>

          {/* Product UI */}
          <div className="p-6 bg-gradient-to-br from-gray-900/50 to-gray-800/50">
            <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6 space-y-4">
              {/* Header */}
              <div className="border-b border-white/10 pb-4">
                <h3 className="text-lg font-semibold text-white">Compose Email</h3>
                <p className="text-sm text-white/60">Send a new email through your connected Resend account</p>
              </div>

              {/* From field */}
              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">From</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value="info"
                    readOnly
                    className="flex-1 px-3 py-2 border border-white/20 rounded-lg bg-white/5 text-white text-sm focus:outline-none"
                  />
                  <span className="flex items-center text-white/50">@</span>
                  <select
                    disabled
                    className="flex-1 px-3 py-2 border border-white/20 rounded-lg bg-white/5 text-white text-sm focus:outline-none"
                  >
                    <option>example.com</option>
                  </select>
                </div>
                <p className="text-xs text-white/50 mt-1">Email will be sent from: info@example.com</p>
              </div>

              {/* To field */}
              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">To</label>
                <input
                  type="email"
                  value="customer@example.com"
                  readOnly
                  className="w-full px-3 py-2 border border-white/20 rounded-lg bg-white/5 text-white text-sm focus:outline-none"
                />
              </div>

              {/* Subject field */}
              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">Subject</label>
                <input
                  type="text"
                  value="Welcome to MailDesk"
                  readOnly
                  className="w-full px-3 py-2 border border-white/20 rounded-lg bg-white/5 text-white text-sm focus:outline-none"
                />
              </div>

              {/* Message field */}
              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">Message</label>
                <textarea
                  value="Thank you for signing up for MailDesk. We're excited to help you send emails without writing code..."
                  readOnly
                  rows={4}
                  className="w-full px-3 py-2 border border-white/20 rounded-lg bg-white/5 text-white text-sm resize-none focus:outline-none"
                />
              </div>

              {/* Send button */}
              <div className="flex justify-end pt-2">
                <button
                  disabled
                  className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-2 rounded-lg text-sm font-medium opacity-70 shadow-lg shadow-blue-500/25"
                >
                  Send Email
                </button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
