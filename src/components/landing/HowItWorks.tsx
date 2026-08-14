export default function HowItWorks() {
  const steps = [
    {
      number: '01',
      title: 'Connect Resend',
      description: 'Add your Resend API key and securely connect your existing email infrastructure.',
    },
    {
      number: '02',
      title: 'Compose',
      description: 'Write your email using a familiar interface. No API requests, SDKs, or code required.',
    },
    {
      number: '03',
      title: 'Send',
      description: 'Choose your sender, click send, and let Resend handle delivery.',
    },
  ];

  return (
    <section id="how-it-works" className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            From API key to sent email in minutes
          </h2>
          <p className="text-lg text-gray-600">
            MailDesk gives you a simple interface on top of the email infrastructure you already use.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 relative">
          {/* Connecting line for desktop */}
          <div className="hidden md:block absolute top-12 left-1/4 right-1/4 h-px bg-gray-200" />

          {steps.map((step, index) => (
            <div key={index} className="relative">
              <div className="bg-white border border-gray-200 rounded-lg p-8 relative">
                <div className="text-4xl font-bold text-gray-200 mb-4">{step.number}</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">{step.title}</h3>
                <p className="text-gray-600 leading-relaxed">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
