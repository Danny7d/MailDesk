'use client';

import { motion } from 'framer-motion';

export default function FeatureBento() {
  const features = [
    {
      title: 'No code required',
      description: 'Skip the API, SDK, and backend. Just compose and send.',
      size: 'col-span-2 row-span-2',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
      visual: (
        <div className="mt-4 space-y-3">
          <div className="flex items-center gap-2">
            <div className="px-3 py-1.5 bg-gray-100 border border-gray-200 rounded-lg text-xs font-medium text-gray-700">API</div>
            <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <div className="px-3 py-1.5 bg-gray-100 border border-gray-200 rounded-lg text-xs font-medium text-gray-700">SDK</div>
            <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <div className="px-3 py-1.5 bg-gray-100 border border-gray-200 rounded-lg text-xs font-medium text-gray-700">Backend</div>
          </div>
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
            <div className="px-3 py-1.5 bg-blue-100 border border-blue-200 rounded-lg text-xs font-semibold text-blue-700">MailDesk</div>
            <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <div className="px-3 py-1.5 bg-green-100 border border-green-200 rounded-lg text-xs font-semibold text-green-700">Send</div>
          </div>
        </div>
      ),
    },
    {
      title: 'Your Resend account',
      description: 'Connect your existing infrastructure. We don\'t replace your provider.',
      size: 'col-span-1 row-span-1',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
      ),
      visual: (
        <div className="mt-3 flex items-center gap-2">
          <div className="px-3 py-1.5 bg-orange-100 border border-orange-200 rounded-lg text-xs font-semibold text-orange-700">Resend</div>
          <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <div className="px-3 py-1.5 bg-blue-100 border border-blue-200 rounded-lg text-xs font-semibold text-blue-700">MailDesk</div>
          <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <div className="px-3 py-1.5 bg-green-100 border border-green-200 rounded-lg text-xs font-semibold text-green-700">Recipient</div>
        </div>
      ),
    },
    {
      title: 'Simple enough for anyone',
      description: 'Compose emails through a familiar interface.',
      size: 'col-span-1 row-span-1',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
        </svg>
      ),
      visual: (
        <div className="mt-3 bg-white border border-gray-200 rounded-xl p-3 shadow-sm">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full" />
              <div className="h-2 bg-gray-100 rounded flex-1" />
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-gray-200 rounded-full" />
              <div className="h-2 bg-gray-100 rounded w-3/4" />
            </div>
          </div>
        </div>
      ),
    },
    {
      title: 'Email history',
      description: 'Track what you\'ve sent with delivery status.',
      size: 'col-span-1 row-span-2',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      visual: (
        <div className="mt-3 space-y-2">
          {[
            { subject: 'Welcome email', status: 'Delivered' },
            { subject: 'Account ready', status: 'Delivered' },
            { subject: 'Project update', status: 'Delivered' },
          ].map((email, i) => (
            <div key={i} className="flex items-center justify-between bg-white border border-gray-100 rounded-lg p-2.5">
              <span className="text-xs font-medium text-gray-700 truncate flex-1">{email.subject}</span>
              <span className="text-xs font-semibold text-green-600 bg-green-50 border border-green-200 px-2 py-1 rounded-full ml-2 whitespace-nowrap">
                {email.status}
              </span>
            </div>
          ))}
        </div>
      ),
    },
    {
      title: 'Secure by design',
      description: 'Your credentials are encrypted and never exposed.',
      size: 'col-span-1 row-span-1',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      ),
      visual: (
        <div className="mt-3 flex items-center justify-center">
          <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        </div>
      ),
    },
  ];

  return (
    <section className="py-32 bg-white relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-3xl mx-auto mb-20"
        >
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
            Everything you need
          </h2>
          <p className="text-xl text-gray-600">
            A powerful set of features designed to make email sending effortless.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-[200px]">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className={`${feature.size} bg-gradient-to-br from-gray-50 to-white border border-gray-200 rounded-2xl p-6 hover:border-blue-500/50 hover:shadow-xl hover:shadow-blue-500/10 transition-all duration-300 group`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center text-white group-hover:scale-110 transition-transform shadow-lg shadow-blue-500/25">
                  {feature.icon}
                </div>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">{feature.title}</h3>
              <p className="text-gray-600 text-sm mb-4">{feature.description}</p>
              {feature.visual}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
