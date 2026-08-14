import Navbar from '@/components/landing/Navbar';
import Hero from '@/components/landing/Hero';
import ValueStrip from '@/components/landing/ValueStrip';
import HowItWorks from '@/components/landing/HowItWorks';
import Benefits from '@/components/landing/Benefits';
import Security from '@/components/landing/Security';
import CTA from '@/components/landing/CTA';
import Footer from '@/components/landing/Footer';

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <Hero />
      <ValueStrip />
      <HowItWorks />
      <Benefits />
      <Security />
      <CTA />
      <Footer />
    </div>
  );
}
