import Navbar from '@/components/landing/Navbar';
import Hero from '@/components/landing/Hero';
import Pipeline from '@/components/landing/Pipeline';
import ProductShowcase from '@/components/landing/ProductShowcase';
import Security from '@/components/landing/Security';
import CTA from '@/components/landing/CTA';
import Footer from '@/components/landing/Footer';

export default function Home() {
  return (
    <div className="min-h-screen bg-[#08080B]">
      <Navbar />
      <Hero />
      <Pipeline />
      <ProductShowcase />
      <Security />
      <CTA />
      <Footer />
    </div>
  );
}
