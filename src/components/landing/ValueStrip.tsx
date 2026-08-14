export default function ValueStrip() {
  const values = [
    { label: 'No code' },
    { label: 'Your Resend account' },
    { label: 'Secure by design' },
    { label: 'Simple email workflow' },
  ];

  return (
    <section className="border-y border-gray-200 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-wrap justify-center gap-8 sm:gap-16">
          {values.map((value, index) => (
            <div key={index} className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-600" />
              <span className="text-sm font-medium text-gray-700">{value.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
