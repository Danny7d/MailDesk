import Link from 'next/link';

export default function CTA() {
  return (
    <section className="py-24 bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
          Ready to send your first email?
        </h2>
        <p className="text-xl text-gray-300 mb-10">
          Connect your Resend account and start sending without writing a line of code.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Link
            href="/signup"
            className="bg-blue-600 text-white hover:bg-blue-700 px-8 py-3 rounded-lg text-base font-medium transition-colors w-full sm:w-auto"
          >
            Create your free account
          </Link>
          <Link
            href="/login"
            className="text-gray-300 hover:text-white text-sm font-medium transition-colors"
          >
            Already have an account? Sign in
          </Link>
        </div>
      </div>
    </section>
  );
}
