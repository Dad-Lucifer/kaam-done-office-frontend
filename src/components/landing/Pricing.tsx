import { type MouseEvent } from 'react';
import { motion, useMotionValue, useMotionTemplate } from 'framer-motion';
import { FadeUp } from './FadeUp';
import { Check, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const packages = [
  {
    name: 'Essential',
    title: 'Essential Plan',
    price: '₹250',
    period: '/month',
    features: [
      'Work with up to 4 members',
      'Create 3 categories',
      '3 chat rooms',
      '1 voice channel',
      '1 public chat room',
      'Role management system',
      'Basic team collaboration features',
      'Secure cloud-based access',
      'Simple and easy workspace management',
      'Standard customer support',
    ],
    featured: false
  },
  {
    name: 'Growth',
    title: 'Growth Plan',
    price: '₹799',
    period: '/month',
    features: [
      'Work with up to 15 members',
      'Create 10 categories',
      '15 chat rooms',
      '5 voice channels',
      '3 public chat rooms',
      'Custom server banner',
      'Role management system',
      'File sharing support',
      'Priority customer support',
      'Basic analytics dashboard',
    ],
    featured: true,
  },
  {
    name: 'Scale',
    title: 'Scale Plan',
    price: '₹1999',
    period: '/month',
    features: [
      'Work with unlimited members',
      'Unlimited categories',
      'Unlimited chat rooms',
      'Unlimited voice channels',
      'Unlimited public chat rooms',
      'Advanced admin controls',
      'Team permissions & moderation tools',
      'AI-powered analytics dashboard',
      'Custom branding support',
      'Priority infrastructure performance',
      'API & webhook integrations',
      'Premium support with faster response time',
      'Early access to new features',
    ],
    featured: false
  },
];

function PricingCard({ plan, index }: { plan: typeof packages[0], index: number }) {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  function handleMouseMove({ currentTarget, clientX, clientY }: MouseEvent) {
    const { left, top } = currentTarget.getBoundingClientRect();
    mouseX.set(clientX - left);
    mouseY.set(clientY - top);
  }

  return (
    <FadeUp delay={0.2 + index * 0.1} className="h-full flex flex-col">
      <div 
        onMouseMove={handleMouseMove}
        className={`group relative flex flex-col w-full h-full bg-[#050505] rounded-[32px] p-8 md:p-10 transition-all duration-500 hover:-translate-y-2 ${
          plan.featured 
            ? 'border border-[rgba(124,58,237,0.3)] shadow-[0_20px_80px_rgba(124,58,237,0.15)]' 
            : 'border border-[rgba(255,255,255,0.06)] shadow-xl'
        }`}
      >
        {/* Spotlight Overlay */}
        <motion.div
          className="pointer-events-none absolute -inset-px rounded-[32px] opacity-0 transition duration-500 group-hover:opacity-100"
          style={{
            background: useMotionTemplate`
              radial-gradient(
                600px circle at ${mouseX}px ${mouseY}px,
                ${plan.featured ? 'rgba(124, 58, 237, 0.25)' : 'rgba(255, 255, 255, 0.08)'},
                transparent 40%
              )
            `,
          }}
        />

        {/* Featured Background Glow */}
        {plan.featured && (
          <div className="absolute inset-0 bg-gradient-to-b from-[rgba(124,58,237,0.1)] to-transparent pointer-events-none rounded-[32px]"></div>
        )}

        <div className="relative z-10 flex flex-col h-full">
          {plan.featured && (
            <div className="absolute top-0 right-0 bg-gradient-to-r from-purple-light to-purple-primary text-white text-[10px] font-bold tracking-widest uppercase px-4 py-1.5 rounded-full shadow-[0_0_20px_rgba(124,58,237,0.4)]">
              Most Popular
            </div>
          )}

          <h3 className={`text-[14px] font-display font-semibold tracking-[0.1em] uppercase ${
            plan.featured ? 'text-purple-light' : 'text-text-tertiary'
          }`}>
            {plan.name}
          </h3>
          
          <div className="mt-4 flex items-end gap-1 pb-8 border-b border-[rgba(255,255,255,0.06)]">
            <span className="font-display font-bold text-[48px] md:text-[56px] text-text-primary leading-[0.9]">
              {plan.price}
            </span>
            <span className="text-[14px] text-text-tertiary mb-1">{plan.period}</span>
          </div>

          <div className="flex flex-col gap-4 mt-8 mb-10 flex-1">
            {plan.features.map((feat, j) => (
              <div key={j} className="flex items-start gap-4">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                  plan.featured ? 'bg-[rgba(124,58,237,0.15)] text-purple-light' : 'bg-[rgba(255,255,255,0.05)] text-text-tertiary group-hover:text-white transition-colors'
                }`}>
                  <Check size={12} strokeWidth={3} />
                </div>
                <span className="text-[14px] md:text-[15px] text-text-secondary leading-[1.5] group-hover:text-text-primary transition-colors">
                  {feat}
                </span>
              </div>
            ))}
          </div>

          <Link 
            to="/signup"
            className={`group/btn w-full h-14 rounded-2xl flex items-center justify-center text-[15px] font-semibold transition-all duration-300 relative overflow-hidden ${
              plan.featured
                ? 'bg-text-primary text-base hover:scale-[1.02] active:scale-[0.98]'
                : 'bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] text-text-primary hover:bg-[rgba(255,255,255,0.08)]'
            }`}
          >
            {plan.featured && (
              <div className="absolute inset-0 bg-gradient-to-r from-purple-light to-purple-primary opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300"></div>
            )}
            <span className={`relative z-10 flex items-center gap-2 ${plan.featured ? 'group-hover/btn:text-white transition-colors' : ''}`}>
              Get Started <ArrowRight size={16} className="transition-transform group-hover/btn:translate-x-1" />
            </span>
          </Link>
        </div>
      </div>
    </FadeUp>
  );
}

export default function Pricing() {
  return (
    <section id="pricing" className="py-24 md:py-[160px] px-6 md:px-12 relative overflow-hidden">
      {/* Deep Background Lighting */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[60vw] h-[400px] bg-purple-primary/5 rounded-[100%] blur-[120px] pointer-events-none -z-10"></div>

      <div className="flex flex-col items-center text-center max-w-[800px] mx-auto mb-20 md:mb-24">
        <FadeUp>
          <div className="inline-flex items-center gap-2.5 bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.1)] rounded-full px-5 py-2 mb-6 backdrop-blur-md">
            <span className="text-[11px] font-bold text-text-secondary tracking-[0.2em] uppercase">Transparent Pricing</span>
          </div>
        </FadeUp>
        <FadeUp delay={0.1}>
          <h2 className="font-display font-black text-[40px] md:text-[56px] lg:text-[72px] leading-[1.0] tracking-[-0.03em] text-transparent bg-clip-text bg-gradient-to-b from-white via-white/90 to-white/20 mb-6">
            Scale without limits.
          </h2>
        </FadeUp>
        <FadeUp delay={0.2}>
          <p className="text-[16px] md:text-[20px] leading-[1.6] text-text-secondary max-w-[500px]">
            Start free. Scale when you need power. No hidden fees, ever.
          </p>
        </FadeUp>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-[1200px] mx-auto">
        {packages.map((plan, i) => (
          <PricingCard key={plan.name} plan={plan} index={i} />
        ))}
      </div>
    </section>
  );
}
