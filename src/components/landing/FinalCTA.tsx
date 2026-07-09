import { FadeUp } from './FadeUp';
import { Link } from 'react-router-dom';

export default function FinalCTA() {
  return (
    <section className="relative py-24 md:py-32 px-6 overflow-hidden flex flex-col items-center border-t border-[rgba(255,255,255,0.08)]">
      
      {/* Background Glow */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(circle at center, rgba(124,58,237,0.08) 0%, transparent 60%)'
        }}
      />

      <div className="relative z-10 flex flex-col items-center text-center max-w-[720px] w-full">
        <FadeUp>
          <h2 className="font-display font-semibold text-[32px] md:text-[44px] leading-[1.15] tracking-[-0.02em] text-text-primary">
            Build Your Virtual Office Today.
          </h2>
        </FadeUp>
        
        <FadeUp delay={0.1}>
          <p className="mt-4 text-[16px] md:text-[18px] leading-[1.6] text-text-secondary">
            Stop managing chaos. Start managing growth.
          </p>
        </FadeUp>
        
        <FadeUp delay={0.2}>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-8 w-full">
            <Link 
              to="/signup"
              className="h-[44px] px-8 bg-purple-primary text-white text-[15px] font-semibold rounded-[10px] flex items-center justify-center hover:bg-purple-light hover:shadow-[0_0_30px_rgba(124,58,237,0.3)] transition-all duration-150 w-full sm:w-auto"
            >
              Get Started — Free
            </Link>
            <a 
              href="#contact"
              className="h-[44px] px-8 bg-transparent border border-[rgba(255,255,255,0.12)] text-text-primary text-[15px] font-semibold rounded-[10px] flex items-center justify-center hover:bg-[rgba(255,255,255,0.04)] transition-all duration-150 w-full sm:w-auto"
            >
              Talk to Sales
            </a>
          </div>
        </FadeUp>

        <FadeUp delay={0.3}>
          <p className="mt-5 text-[13px] text-text-tertiary">
            No credit card required · Free for up to 10 users · Setup in 60 seconds
          </p>
        </FadeUp>
      </div>
    </section>
  );
}
