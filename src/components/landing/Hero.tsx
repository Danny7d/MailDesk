import Link from 'next/link';
import ProductPreview from './ProductPreview';

export default function Hero() {
  return (
    <section className="pt-32 pb-20 sm:pt-40 sm:pb-32 bg-linear-to-b from-gray-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <p className="text-sm font-semibold text-blue-600 uppercase tracking-wide mb-4">
            No-code email sending
          </p>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6 leading-tight">
            Send emails without writing code
          </h1>
          <p className="text-xl text-gray-600 mb-10 leading-relaxed">
            Connect your Resend account and send transactional emails through a simple, familiar interface.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/signup"
              className="bg-blue-600 text-white hover:bg-blue-700 px-8 py-3 rounded-lg text-base font-medium transition-colors"
            >
              Get started free
            </Link>
            <Link
              href="#how-it-works"
              className="border border-gray-300 text-gray-700 hover:bg-gray-50 px-8 py-3 rounded-lg text-base font-medium transition-colors"
            >
              See how it works
            </Link>
          </div>
        </div>

        <ProductPreview />
      </div>
    </section>
  );
}
