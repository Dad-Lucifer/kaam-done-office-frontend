import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { FadeUp } from './FadeUp';
import { 
  ArrowRight,
  CheckCircle2,
  BarChart3,
  Users
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { type MouseEvent, useEffect } from 'react';

export default function Hero() {
  const mouseX = useMotionValue(0.5);
  const mouseY = useMotionValue(0.5);

  const springConfig = { damping: 40, stiffness: 150, mass: 0.8 };
  const springX = useSpring(mouseX, springConfig);
  const springY = useSpring(mouseY, springConfig);

  // Different translation speeds for floating elements
  const x1 = useTransform(springX, [0, 1], [-30, 30]);
  const y1 = useTransform(springY, [0, 1], [-30, 30]);

  const x2 = useTransform(springX, [0, 1], [40, -40]);
  const y2 = useTransform(springY, [0, 1], [40, -40]);

  const x3 = useTransform(springX, [0, 1], [-20, 20]);
  const y3 = useTransform(springY, [0, 1], [30, -30]);

  function handleMouseMove(e: MouseEvent) {
    const { innerWidth, innerHeight } = window;
    mouseX.set(e.clientX / innerWidth);
    mouseY.set(e.clientY / innerHeight);
  }

  useEffect(() => {
    mouseX.set(0.5);
    mouseY.set(0.5);
  }, [mouseX, mouseY]);

  return (
    <section 
      onMouseMove={handleMouseMove}
      className="relative min-h-[90vh] lg:min-h-screen pt-32 pb-20 flex flex-col items-center justify-center overflow-hidden"
    >
      {/* Deep Atmospheric Background */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
        <div className="w-[80vw] h-[80vw] max-w-[1000px] max-h-[1000px] bg-purple-primary/10 rounded-full blur-[160px] mix-blend-screen opacity-60 animate-pulse-slow"></div>
      </div>
      <div 
        className="absolute inset-0 opacity-[0.03] pointer-events-none z-0"
        style={{
          backgroundImage: `linear-gradient(rgba(255, 255, 255, 1) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 1) 1px, transparent 1px)`,
          backgroundSize: '40px 40px',
          maskImage: 'radial-gradient(circle at center, black 40%, transparent 80%)',
          WebkitMaskImage: 'radial-gradient(circle at center, black 40%, transparent 80%)'
        }}
      />

      {/* Floating 3D Widgets (Absolutely Positioned around the center) */}
      <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden hidden md:block">
        
        {/* Top Right Widget */}
        <motion.div 
          style={{ x: x1, y: y1 }}
          className="absolute right-[5%] lg:right-[15%] top-[15%] lg:top-[20%] w-[240px] p-5 bg-elevated/40 backdrop-blur-xl border border-[rgba(255,255,255,0.08)] rounded-2xl shadow-[0_20px_60px_rgba(124,58,237,0.15)]"
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="w-10 h-10 rounded-full bg-purple-primary/10 flex items-center justify-center border border-purple-primary/20">
              <BarChart3 size={18} className="text-purple-primary" />
            </div>
            <div>
              <p className="text-[12px] text-text-tertiary">Productivity</p>
              <p className="text-[16px] font-bold text-text-primary">94% Active</p>
            </div>
          </div>
          <div className="h-2 w-full bg-surface rounded-full overflow-hidden">
            <div className="h-full bg-purple-primary rounded-full w-[94%]"></div>
          </div>
        </motion.div>

        {/* Bottom Left Widget */}
        <motion.div 
          style={{ x: x2, y: y2 }}
          className="absolute left-[2%] lg:left-[10%] bottom-[15%] lg:bottom-[20%] w-[220px] p-4 bg-surface/60 backdrop-blur-xl border border-[rgba(255,255,255,0.12)] rounded-2xl shadow-[0_20px_40px_rgba(0,0,0,0.4)]"
        >
          <div className="flex items-center gap-3 mb-4">
            <Users size={16} className="text-text-secondary" />
            <span className="text-[13px] font-medium text-text-primary">Engineering Team</span>
          </div>
          <div className="flex -space-x-2">
            {[1,2,3,4,5].map(i => (
              <div key={i} className={`w-8 h-8 rounded-full border-2 border-surface flex items-center justify-center text-[10px] font-bold text-white ${['bg-purple-500', 'bg-blue-500', 'bg-green-500', 'bg-orange-500', 'bg-pink-500'][i-1]}`}>
                {['A','B','C','D','E'][i-1]}
              </div>
            ))}
          </div>
        </motion.div>

        {/* Bottom Right Widget */}
        <motion.div 
          style={{ x: x3, y: y3 }}
          className="absolute right-[2%] lg:right-[10%] bottom-[10%] lg:bottom-[15%] w-[180px] p-4 bg-surface/60 backdrop-blur-xl border border-[rgba(255,255,255,0.12)] rounded-2xl shadow-[0_20px_40px_rgba(0,0,0,0.4)] flex items-center gap-3"
        >
          <div className="w-8 h-8 rounded-full bg-green-accent/10 flex items-center justify-center">
            <CheckCircle2 size={16} className="text-green-accent" />
          </div>
          <div className="flex flex-col">
            <span className="text-[13px] font-medium text-text-primary">System Live</span>
            <span className="text-[11px] text-text-tertiary">All modules online</span>
          </div>
        </motion.div>
      </div>

      <div className="max-w-[1200px] mx-auto w-full px-6 md:px-12 relative z-20 flex flex-col items-center text-center mt-10 md:mt-0">
        
        <FadeUp>
          <div className="inline-flex items-center gap-2.5 bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.1)] rounded-full px-4 py-1.5 mb-6 md:mb-8 backdrop-blur-md">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-light opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-primary"></span>
            </span>
            <span className="text-[12px] font-semibold text-text-secondary tracking-[0.15em] uppercase">Virtual Office OS</span>
          </div>
        </FadeUp>
        
        <FadeUp delay={0.1} className="w-full">
          <h1 className="font-display font-black text-[60px] sm:text-[100px] md:text-[140px] lg:text-[180px] xl:text-[220px] leading-[0.85] tracking-[-0.04em] text-transparent bg-clip-text bg-gradient-to-b from-white via-white/90 to-white/10 mb-4 md:mb-6 drop-shadow-2xl">
            KAAM DONE
          </h1>
          <p className="text-[20px] md:text-[32px] font-medium text-transparent bg-clip-text bg-gradient-to-r from-purple-light to-white mb-8">
            The Virtual Office. Perfected.
          </p>
        </FadeUp>
        
        <FadeUp delay={0.2}>
          <p className="text-[16px] md:text-[20px] leading-[1.6] text-text-secondary max-w-[600px] mx-auto mb-12">
            Replace physical complexity with a beautifully engineered virtual operating system. Manage, track, and scale effortlessly.
          </p>
        </FadeUp>
        
        <FadeUp delay={0.3}>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-5 w-full">
            <Link 
              to="/signup"
              className="group relative h-14 px-10 bg-text-primary text-[15px] font-semibold rounded-2xl flex items-center justify-center overflow-hidden transition-transform hover:scale-[1.02] active:scale-[0.98] w-full sm:w-auto"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-purple-light to-purple-primary opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <span className="relative z-10 flex items-center gap-2 group-hover:text-white transition-colors duration-300">
                Start Building <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
              </span>
            </Link>
            <a 
              href="#solution"
              className="group h-14 px-10 bg-transparent text-text-primary text-[15px] font-semibold rounded-2xl flex items-center justify-center hover:bg-[rgba(255,255,255,0.05)] transition-all duration-300 w-full sm:w-auto"
            >
              See how it works
            </a>
          </div>
        </FadeUp>
      </div>
    </section>
  );
}
