import { useState, type MouseEvent } from 'react';
import { motion, AnimatePresence, useMotionValue, useMotionTemplate } from 'framer-motion';
import { FadeUp } from './FadeUp';
import { Plus } from 'lucide-react';

const faqs = [
  {
    q: "What is Operiq?",
    a: "Operiq is an all-in-one virtual office operating system that lets businesses manage teams, attendance, tasks, and operations from a single platform — replacing the need for a physical office."
  },
  {
    q: "How does Operiq work?",
    a: "Sign up, create your organization, invite your team, and start managing. Everything runs in the cloud — no installations, no physical infrastructure required."
  },
  {
    q: "Can I manage remote teams with Operiq?",
    a: "Absolutely. Operiq is explicitly built for distributed and remote teams. Track attendance, assign tasks, and collaborate seamlessly regardless of geographic location."
  },
  {
    q: "Is there a free trial?",
    a: "Yes. Our Essential plan allows you to experience the core features of Operiq without any upfront commitment."
  },
  {
    q: "How secure is my data?",
    a: "We deploy enterprise-grade encryption, conduct regular security audits, and run on SOC 2 compliant infrastructure. Your operational data is Fort Knox secure."
  },
  {
    q: "Can I upgrade my plan later?",
    a: "Yes, you can scale your plan instantly from your dashboard as your team grows. Changes and new features take effect immediately."
  },
  {
    q: "What integrations do you support?",
    a: "Operiq integrates with standard enterprise tools like Slack, Google Workspace, and Microsoft 365. Full API access is available on the Scale plan."
  },
  {
    q: "Is there a mobile app?",
    a: "A highly responsive mobile web experience is available immediately. Native iOS and Android applications are currently in development."
  }
];

function FAQItem({ faq, isOpen, toggle, index }: { faq: typeof faqs[0], isOpen: boolean, toggle: () => void, index: number }) {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  function handleMouseMove({ currentTarget, clientX, clientY }: MouseEvent) {
    const { left, top } = currentTarget.getBoundingClientRect();
    mouseX.set(clientX - left);
    mouseY.set(clientY - top);
  }

  return (
    <FadeUp delay={0.1 + index * 0.05}>
      <motion.div 
        layout
        onMouseMove={handleMouseMove}
        className={`group relative overflow-hidden transition-all duration-500 rounded-2xl mb-4 ${
          isOpen 
            ? 'bg-[rgba(124,58,237,0.05)] border border-[rgba(124,58,237,0.3)] shadow-[0_10px_40px_rgba(124,58,237,0.1)]' 
            : 'bg-[#050505] border border-[rgba(255,255,255,0.05)] hover:border-[rgba(255,255,255,0.12)]'
        }`}
      >
        {/* Interactive Spotlight Overlay */}
        <motion.div
          className="pointer-events-none absolute -inset-px rounded-2xl opacity-0 transition duration-500 group-hover:opacity-100"
          style={{
            background: useMotionTemplate`
              radial-gradient(
                600px circle at ${mouseX}px ${mouseY}px,
                ${isOpen ? 'rgba(124, 58, 237, 0.15)' : 'rgba(255, 255, 255, 0.06)'},
                transparent 40%
              )
            `,
          }}
        />

        <button 
          onClick={toggle}
          className="relative z-10 w-full min-h-[72px] flex items-center justify-between px-6 py-5 text-left cursor-pointer"
        >
          <span className={`text-[16px] md:text-[18px] font-medium transition-colors duration-300 pr-8 ${
            isOpen ? 'text-white' : 'text-text-primary group-hover:text-white'
          }`}>
            {faq.q}
          </span>
          <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-500 ${
            isOpen ? 'bg-purple-primary text-white rotate-45' : 'bg-[rgba(255,255,255,0.05)] text-text-tertiary group-hover:bg-[rgba(255,255,255,0.1)] group-hover:text-white'
          }`}>
            <Plus size={16} strokeWidth={2.5} />
          </div>
        </button>
        
        <AnimatePresence initial={false}>
          {isOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="relative z-10 overflow-hidden"
            >
              <div className="px-6 pb-6 pt-2 text-[15px] md:text-[16px] leading-[1.6] text-text-secondary border-t border-[rgba(124,58,237,0.1)] mt-2">
                <p className="pt-4">{faq.a}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </FadeUp>
  );
}

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggle = (i: number) => {
    setOpenIndex(openIndex === i ? null : i);
  };

  return (
    <section id="faq" className="py-24 md:py-[160px] px-6 md:px-12 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-0 right-0 w-[50vw] h-[500px] bg-purple-primary/5 rounded-[100%] blur-[150px] pointer-events-none -z-10"></div>

      <div className="flex flex-col items-center text-center max-w-[800px] mx-auto mb-16 md:mb-20">
        <FadeUp>
          <div className="inline-flex items-center gap-2.5 bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.1)] rounded-full px-5 py-2 mb-6 backdrop-blur-md">
            <span className="text-[11px] font-bold text-text-secondary tracking-[0.2em] uppercase">Knowledge Base</span>
          </div>
        </FadeUp>
        <FadeUp delay={0.1}>
          <h2 className="font-display font-black text-[40px] md:text-[56px] leading-[1.05] tracking-[-0.03em] text-transparent bg-clip-text bg-gradient-to-b from-white via-white/90 to-white/20">
            Frequently Asked Questions.
          </h2>
        </FadeUp>
      </div>

      <div className="flex flex-col max-w-[800px] mx-auto w-full">
        {faqs.map((faq, i) => (
          <FAQItem 
            key={i} 
            index={i}
            faq={faq} 
            isOpen={openIndex === i} 
            toggle={() => toggle(i)} 
          />
        ))}
      </div>
    </section>
  );
}
