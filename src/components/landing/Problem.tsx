import { motion, useMotionTemplate, useMotionValue } from 'framer-motion';
import { staggerContainer, fadeUpVariants } from '../../lib/motion';
import { type MouseEvent } from 'react';
import { CalendarX, ListTodo, MessageCircleOff, Building, Users } from 'lucide-react';
import { FadeUp } from './FadeUp';

const problems = [
  {
    icon: CalendarX,
    title: "Attendance Chaos",
    desc: "Spreadsheets, manual entries, and constant follow-ups just to know who showed up."
  },
  {
    icon: ListTodo,
    title: "Task Tracking Mess",
    desc: "Tasks lost across Slack, email, and sticky notes. Nothing gets tracked properly."
  },
  {
    icon: MessageCircleOff,
    title: "Communication Gaps",
    desc: "Information scattered everywhere. Teams work in silos, not sync."
  },
  {
    icon: Building,
    title: "Office Overhead",
    desc: "Rent, utilities, infrastructure — paying for a physical building when all you really need is an operating system."
  },
  {
    icon: Users,
    title: "Scattered Employee Data",
    desc: "HR records in one place, attendance in another, performance nowhere. A logistical nightmare."
  }
];

const bentoClasses = [
  "md:col-span-2 lg:col-span-2", // 1
  "md:col-span-2 lg:col-span-2", // 2
  "md:col-span-2 lg:col-span-2", // 3 (On tablet this wraps, which is fine)
  "md:col-span-2 lg:col-span-3", // 4
  "md:col-span-4 lg:col-span-3", // 5
];

function ProblemCard({ item, index }: { item: typeof problems[0], index: number }) {
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
      className={`group relative flex flex-col rounded-[20px] bg-elevated border border-[rgba(255,255,255,0.04)] overflow-hidden transition-transform duration-500 hover:-translate-y-1 ${bentoClasses[index]}`}
    >
      {/* Spotlight Background Fill - Stark Monochrome */}
      <motion.div
        className="pointer-events-none absolute -inset-px opacity-0 transition-opacity duration-300 group-hover:opacity-100 z-0"
        style={{
          background: useMotionTemplate`
            radial-gradient(
              450px circle at ${mouseX}px ${mouseY}px,
              rgba(255, 255, 255, 0.025),
              transparent 80%
            )
          `,
        }}
      />

      {/* Spotlight Border - Crisp Silver */}
      <motion.div
        className="pointer-events-none absolute -inset-px rounded-[20px] opacity-0 transition-opacity duration-300 group-hover:opacity-100 z-20"
        style={{
          background: useMotionTemplate`
            radial-gradient(
              250px circle at ${mouseX}px ${mouseY}px,
              rgba(255, 255, 255, 0.25),
              transparent 80%
            )
          `,
          WebkitMaskImage: `linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)`,
          WebkitMaskComposite: `xor`,
          maskComposite: `exclude`,
          padding: `1px`,
        }}
      />
      
      <div className="relative flex flex-col h-full bg-base/60 backdrop-blur-md rounded-[19px] p-6 md:p-8 lg:p-10 z-10 transition-colors duration-500 group-hover:bg-transparent">
        <div className="w-12 h-12 rounded-2xl bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.06)] flex items-center justify-center mb-6 md:mb-8 transition-all duration-500 group-hover:bg-[rgba(255,255,255,0.08)] group-hover:border-[rgba(255,255,255,0.2)] group-hover:shadow-[0_0_24px_rgba(255,255,255,0.05)] group-hover:-translate-y-1 group-hover:scale-110 origin-left">
           <item.icon size={22} className="text-text-tertiary transition-colors duration-500 group-hover:text-white" />
        </div>
        
        <h3 className="font-display font-semibold text-[20px] md:text-[24px] text-text-primary mb-3 transition-colors duration-300 group-hover:text-white">
          {item.title}
        </h3>
        
        <p className="text-[14px] md:text-[16px] leading-[1.6] text-text-secondary max-w-[480px] transition-colors duration-300 group-hover:text-text-primary/90">
          {item.desc}
        </p>
      </div>
    </motion.div>
  );
}

export default function Problem() {
  return (
    <section className="py-20 md:py-[140px] px-6 md:px-12 lg:px-20 max-w-[1200px] mx-auto w-full">
      <div className="flex flex-col items-center text-center max-w-[800px] mx-auto mb-16 md:mb-24">
        <FadeUp>
          <div className="inline-flex items-center gap-3 px-4 py-1.5 rounded-full bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] mb-6">
            <span className="w-2 h-2 rounded-full bg-text-tertiary"></span>
            <span className="text-[12px] font-semibold text-text-secondary tracking-[0.1em] uppercase">
              The Problem
            </span>
          </div>
        </FadeUp>
        <FadeUp delay={0.1}>
          <h2 className="font-display font-semibold text-[38px] md:text-[56px] leading-[1.1] tracking-[-0.02em] text-text-primary mb-6">
            Managing Teams Shouldn't Require <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-text-tertiary to-text-secondary/50">Four Different Tools.</span>
          </h2>
        </FadeUp>
      </div>

      <motion.div 
        variants={staggerContainer}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-80px" }}
        className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 gap-4 lg:gap-6"
      >
        {problems.map((item, index) => (
          <ProblemCard key={index} item={item} index={index} />
        ))}
      </motion.div>
    </section>
  );
}
