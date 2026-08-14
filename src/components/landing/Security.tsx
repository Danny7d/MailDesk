export default function Security() {
  const securityPoints = [
    'AES-256-GCM encryption at rest',
    'API keys never exposed to the browser',
    'User-level data isolation',
    'Rate limiting against abuse',
  ];

  return (
    <section id="security" className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Your credentials stay yours
          </h2>
          <p className="text-lg text-gray-600">
            MailDesk is designed to act as a secure interface between you and your email provider. Your Resend credentials are protected server-side and are never exposed to the browser.
          </p>
        </div>

        {/* Security flow visualization */}
        <div className="max-w-3xl mx-auto mb-16">
          <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-0">
            <div className="bg-gray-50 border border-gray-200 rounded-lg px-6 py-4 text-center">
              <div className="text-sm font-medium text-gray-900">Your Resend account</div>
            </div>
            
            <div className="hidden md:block text-gray-400">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            </div>
            
            <div className="md:hidden text-gray-400">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg px-6 py-4 text-center">
              <div className="text-sm font-medium text-blue-900">Encrypted key</div>
            </div>

            <div className="hidden md:block text-gray-400">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            </div>

            <div className="md:hidden text-gray-400">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-lg px-6 py-4 text-center">
              <div className="text-sm font-medium text-gray-900">MailDesk</div>
            </div>

            <div className="hidden md:block text-gray-400">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            </div>

            <div className="md:hidden text-gray-400">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-lg px-6 py-4 text-center">
              <div className="text-sm font-medium text-gray-900">Resend</div>
            </div>
          </div>
        </div>

        {/* Security points */}
        <div className="max-w-2xl mx-auto">
          <ul className="space-y-4">
            {securityPoints.map((point, index) => (
              <li key={index} className="flex items-start">
                <svg className="w-5 h-5 text-green-500 mr-3 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-gray-700">{point}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
