'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled 
          ? 'bg-[#08080B]/80 backdrop-blur-2xl border-b border-white/5' 
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-20 items-center">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative">
              <div className="absolute inset-0 bg-purple-500/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <Image src="/maildesk-icon.svg" alt="MailDesk" width={32} height={32} className="relative" />
            </div>
            <span className="text-xl font-bold text-white tracking-tight">MailDesk</span>
          </Link>

          {/* Desktop navigation */}
          <div className="hidden md:flex items-center gap-10">
            <Link
              href="#how-it-works"
              className="text-sm text-white/60 hover:text-white transition-colors duration-300"
            >
              How it works
            </Link>
            <Link
              href="#features"
              className="text-sm text-white/60 hover:text-white transition-colors duration-300"
            >
              Features
            </Link>
            <Link
              href="#security"
              className="text-sm text-white/60 hover:text-white transition-colors duration-300"
            >
              Security
            </Link>
          </div>

          {/* Desktop buttons */}
          <div className="hidden md:flex items-center gap-4">
            <Link
              href="/login"
              className="text-sm text-white/70 hover:text-white font-medium transition-colors duration-300"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="relative group bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 shadow-lg shadow-purple-500/20 hover:shadow-purple-500/40 hover:scale-105"
            >
              <span className="relative z-10">Get Started</span>
              <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl blur-xl opacity-0 group-hover:opacity-50 transition-opacity duration-300" />
            </Link>
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-white/60 hover:text-white transition-colors"
            aria-label="Toggle menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {mobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-6 border-t border-white/5 bg-[#08080B]/95 backdrop-blur-2xl">
            <div className="flex flex-col gap-6">
              <Link
                href="#how-it-works"
                className="text-base text-white/70 hover:text-white transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                How it works
              </Link>
              <Link
                href="#features"
                className="text-base text-white/70 hover:text-white transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                Features
              </Link>
              <Link
                href="#security"
                className="text-base text-white/70 hover:text-white transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                Security
              </Link>
              <div className="flex flex-col gap-4 pt-4 border-t border-white/5">
                <Link
                  href="/login"
                  className="text-base text-white/80 hover:text-white font-medium transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Sign in
                </Link>
                <Link
                  href="/signup"
                  className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-5 py-3 rounded-xl text-sm font-semibold transition-all text-center"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Get Started
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
