import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-white border-t border-gray-200 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="text-center md:text-left">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">MailDesk</h3>
            <p className="text-sm text-gray-600">Simple email sending without the code.</p>
          </div>

          <div className="flex flex-wrap justify-center gap-8">
            <Link href="/login" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
              Sign in
            </Link>
            <Link href="/signup" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
              Get started
            </Link>
            <Link href="#security" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
              Security
            </Link>
            <Link href="#how-it-works" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
              How it works
            </Link>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-gray-200 text-center">
          <p className="text-sm text-gray-500">&copy; 2026 MailDesk. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
