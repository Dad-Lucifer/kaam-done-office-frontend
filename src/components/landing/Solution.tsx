import { motion, useMotionTemplate, useMotionValue } from 'framer-motion';
import { staggerContainer, fadeUpVariants } from '../../lib/motion';
import { type MouseEvent } from 'react';
import { 
  Users, 
  Clock, 
  Contact, 
  ShieldCheck, 
  CalendarMinus, 
  LineChart, 
  CheckSquare, 
  CreditCard 
} from 'lucide-react';
import { FadeUp } from './FadeUp';

const solutions = [
  {
    icon: Users,
    title: "Team Management",
    desc: "Organize departments, assign roles, and manage your entire workforce from one dashboard."
  },
  {
    icon: Clock,
    title: "Attendance Tracking",
    desc: "Real-time check-ins, automated reports, and no more manual spreadsheets."
  },
  {
    icon: Contact,
    title: "Employee Directory",
    desc: "Every team member's profile, role, and contact info — always accessible."
  },
  {
    icon: ShieldCheck,
    title: "Role-Based Access",
    desc: "Control who sees what. Admin, manager, or employee — each gets the right view."
  },
  {
    icon: CalendarMinus,
    title: "Leave Management",
    desc: "Apply, approve, and track leaves without a single email thread."
  },
  {
    icon: LineChart,
    title: "Analytics Dashboard",
    desc: "Visual insights on productivity, attendance trends, and team performance."
  },
  {
    icon: CheckSquare,
    title: "Task Management",
    desc: "Create, assign, and track tasks with deadlines, priorities, and progress."
  },
  {
    icon: CreditCard,
    title: "Subscription Management",
    desc: "Flexible plans that scale with your team. Upgrade or downgrade anytime."
  }
];

function FeatureCard({ item }: { item: typeof solutions[0] }) {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  function handleMouseMove({ currentTarget, clientX, clientY }: MouseEvent) {
    const { left, top } = currentTarget.getBoundingClientRect();
    mouseX.set(clientX - left);
    mouseY.set(clientY - top);
  }

  return (
    <motion.div
      variants={fadeUpVariants}
      onMouseMove={handleMouseMove}
      className="group relative flex flex-col rounded-[20px] bg-elevated border border-[rgba(255,255,255,0.05)] overflow-hidden transition-transform duration-500 hover:-translate-y-1"
    >
      {/* Spotlight Background Fill */}
      <motion.div
        className="pointer-events-none absolute -inset-px opacity-0 transition-opacity duration-300 group-hover:opacity-100 z-0"
        style={{
          background: useMotionTemplate`
            radial-gradient(
              400px circle at ${mouseX}px ${mouseY}px,
              rgba(124, 58, 237, 0.08),
              transparent 80%
            )
          `,
        }}
      />

      {/* Spotlight Border */}
      <motion.div
        className="pointer-events-none absolute -inset-px rounded-[20px] opacity-0 transition-opacity duration-300 group-hover:opacity-100 z-20"
        style={{
          background: useMotionTemplate`
            radial-gradient(
              250px circle at ${mouseX}px ${mouseY}px,
              rgba(124, 58, 237, 0.6),
              transparent 80%
            )
          `,
          WebkitMaskImage: `linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)`,
          WebkitMaskComposite: `xor`,
          maskComposite: `exclude`,
          padding: `1px`,
        }}
      />
      
      <div className="relative flex flex-col h-full bg-base/40 backdrop-blur-sm rounded-[19px] p-6 md:p-8 z-10 transition-colors duration-500 group-hover:bg-transparent">
        <div className="w-12 h-12 rounded-2xl bg-[rgba(124,58,237,0.05)] border border-[rgba(124,58,237,0.2)] flex items-center justify-center mb-6 transition-all duration-500 group-hover:bg-purple-primary group-hover:border-purple-primary group-hover:shadow-[0_0_30px_rgba(124,58,237,0.5)] group-hover:-translate-y-1">
           <item.icon size={22} className="text-purple-primary transition-colors duration-500 group-hover:text-white" />
        </div>
        
        <h3 className="font-display font-semibold text-[20px] md:text-[22px] text-text-primary mb-3 transition-colors duration-300 group-hover:text-purple-light">
          {item.title}
        </h3>
        
        <p className="text-[14px] md:text-[15px] leading-[1.6] text-text-secondary transition-colors duration-300 group-hover:text-text-primary/90">
          {item.desc}
        </p>
      </div>
    </motion.div>
  );
}

export default function Solution() {
  return (
    <section id="solution" className="py-20 md:py-[140px] px-6 md:px-12 lg:px-20 max-w-[1200px] mx-auto w-full">
      <div className="flex flex-col items-center text-center max-w-[800px] mx-auto mb-16 md:mb-24">
        <FadeUp>
          <div className="inline-flex items-center gap-3 px-4 py-1.5 rounded-full bg-[rgba(124,58,237,0.05)] border border-[rgba(124,58,237,0.15)] mb-6">
            <span className="w-2 h-2 rounded-full bg-purple-primary animate-pulse"></span>
            <span className="text-[12px] font-semibold text-purple-light tracking-[0.1em] uppercase">
              The Solution
            </span>
          </div>
        </FadeUp>
        <FadeUp delay={0.1}>
          <h2 className="font-display font-semibold text-[38px] md:text-[56px] leading-[1.1] tracking-[-0.02em] text-text-primary mb-6">
            Everything Your Office Needs.<br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-white/80 to-text-tertiary"> Without the Office.</span>
          </h2>
        </FadeUp>
        <FadeUp delay={0.2}>
          <p className="text-[16px] md:text-[20px] leading-[1.6] text-text-secondary max-w-[540px] mx-auto">
            Kaam Done replaces your scattered tools with one intelligent, unified workspace that feels like magic.
          </p>
        </FadeUp>
      </div>

      <motion.div 
        variants={staggerContainer}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-80px" }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6"
      >
        {solutions.map((item, index) => (
          <FeatureCard key={index} item={item} />
        ))}
      </motion.div>
    </section>
  );
}
