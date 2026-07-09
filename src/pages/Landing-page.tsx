import { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import Loader from '../components/landing/Loader';
import Navbar from '../components/landing/Navbar';
import Hero from '../components/landing/Hero';
import Problem from '../components/landing/Problem';
import Solution from '../components/landing/Solution';
import FeatureShowcase from '../components/landing/FeatureShowcase';
import DashboardPreview from '../components/landing/DashboardPreview';
import WhyOperiq from '../components/landing/WhyOperiq';
import Pricing from '../components/landing/Pricing';
import FAQ from '../components/landing/FAQ';
import FinalCTA from '../components/landing/FinalCTA';
import Footer from '../components/landing/Footer';

export default function LandingPage() {
  const [loading, setLoading] = useState(true);

  return (
    <>
      <AnimatePresence mode="wait">
        {loading && <Loader onComplete={() => setLoading(false)} />}
      </AnimatePresence>

      <div className={`bg-base min-h-screen text-text-primary selection:bg-[rgba(124,58,237,0.3)] selection:text-white font-body ${loading ? 'h-screen overflow-hidden' : ''}`}>
        <Navbar />
        <main>
          <Hero />
          <Problem />
          <Solution />
          <FeatureShowcase />
          <DashboardPreview />
          <WhyOperiq />
          <Pricing />
          <FAQ />
          <FinalCTA />
        </main>
        <Footer />
      </div>
    </>
  );
}
