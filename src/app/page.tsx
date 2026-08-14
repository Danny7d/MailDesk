import Navbar from '@/components/landing/Navbar';
import Hero from '@/components/landing/Hero';
import Problem from '@/components/landing/Problem';
import ProductShowcase from '@/components/landing/ProductShowcase';
import FeatureBento from '@/components/landing/FeatureBento';
import Infrastructure from '@/components/landing/Infrastructure';
import HowItWorks from '@/components/landing/HowItWorks';
import Security from '@/components/landing/Security';
import Roadmap from '@/components/landing/Roadmap';
import CTA from '@/components/landing/CTA';
import Footer from '@/components/landing/Footer';

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <Hero />
      <Problem />
      <ProductShowcase />
      <FeatureBento />
      <Infrastructure />
      <HowItWorks />
      <Security />
      <Roadmap />
      <CTA />
      <Footer />
    </div>
  );
}
