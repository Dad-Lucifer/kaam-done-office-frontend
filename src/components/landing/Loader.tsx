import { useState, useEffect } from 'react';
import { motion, useMotionValue, useSpring, useMotionTemplate } from 'framer-motion';

export default function Loader({ onComplete }: { onComplete: () => void }) {
  const [phase, setPhase] = useState<'exploring' | 'expanding' | 'done'>('exploring');
  
  const mouseX = useMotionValue(typeof window !== 'undefined' ? window.innerWidth / 2 : 0);
  const mouseY = useMotionValue(typeof window !== 'undefined' ? window.innerHeight / 2 : 0);
  
  const innerR = useMotionValue(80);
  const outerR = useMotionValue(140);

  // Extremely snappy spring physics for cursor tracking
  const springConfig = { damping: 30, stiffness: 400, mass: 0.2 };
  const springX = useSpring(mouseX, springConfig);
  const springY = useSpring(mouseY, springConfig);
  
  const springInnerR = useSpring(innerR, { damping: 25, stiffness: 80 });
  const springOuterR = useSpring(outerR, { damping: 25, stiffness: 80 });

  const maskImage = useMotionTemplate`radial-gradient(circle at ${springX}px ${springY}px, transparent 0px, transparent ${springInnerR}px, black ${springOuterR}px)`;

  useEffect(() => {
    // 1. Initial centering
    if (typeof window !== 'undefined') {
      mouseX.set(window.innerWidth / 2);
      mouseY.set(window.innerHeight / 2);
    }

    // 2. Global mouse tracking (fixes issues where div doesn't catch the event)
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (phase === 'exploring') {
        mouseX.set(e.clientX);
        mouseY.set(e.clientY);
      }
    };
    
    window.addEventListener('mousemove', handleGlobalMouseMove);

    // 3. Expand after 3.5 seconds
    const timer = setTimeout(() => {
      setPhase('expanding');
      innerR.set(window.innerWidth * 2);
      outerR.set(window.innerWidth * 2 + 100);
    }, 3500);

    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      clearTimeout(timer);
    };
  }, [phase, mouseX, mouseY, innerR, outerR]);

  useEffect(() => {
    if (phase === 'expanding') {
      const timer = setTimeout(() => {
        setPhase('done');
        onComplete();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [phase, onComplete]);

  return (
    <motion.div 
      key="loader"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 1.5, ease: "easeOut" }}
      className="fixed inset-0 z-[100] bg-[#020204] cursor-none flex items-center justify-center overflow-hidden pointer-events-auto"
      style={{
        WebkitMaskImage: maskImage,
        maskImage: maskImage
      }}
    >
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <motion.p 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: phase === 'exploring' ? 0.3 : 0, scale: 1 }}
          transition={{ duration: 1 }}
          className="font-display font-medium text-[24px] md:text-[32px] text-white tracking-widest uppercase pointer-events-none"
        >
          Explore the darkness
        </motion.p>
      </div>

      {phase === 'exploring' && (
        <motion.div
          className="absolute w-2 h-2 bg-white rounded-full pointer-events-none mix-blend-difference z-[110]"
          style={{
            x: springX,
            y: springY,
            translateX: "-50%",
            translateY: "-50%"
          }}
        />
      )}
    </motion.div>
  );
}
