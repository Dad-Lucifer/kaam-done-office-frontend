import { FadeUp } from './FadeUp';
import { X, Check } from 'lucide-react';

export default function WhyOperiq() {
  return (
    <section className="py-24 md:py-[160px] px-6 md:px-12 relative overflow-hidden">
      {/* Deep Background Lighting */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[100vw] h-[600px] bg-purple-primary/5 rounded-[100%] blur-[150px] pointer-events-none -z-10"></div>

      <div className="max-w-[1200px] mx-auto w-full">
        <div className="flex flex-col items-center text-center mb-20 md:mb-32">
          <FadeUp>
            <div className="inline-flex items-center gap-2.5 bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.1)] rounded-full px-5 py-2 mb-6 backdrop-blur-md">
              <span className="text-[11px] font-bold text-text-secondary tracking-[0.2em] uppercase">The Paradigm Shift</span>
            </div>
          </FadeUp>
          <FadeUp delay={0.1}>
            <h2 className="font-display font-black text-[44px] md:text-[64px] lg:text-[80px] leading-[0.95] tracking-[-0.04em] text-transparent bg-clip-text bg-gradient-to-b from-white via-white/90 to-white/20">
              Evolve past the <br/> physical office.
            </h2>
          </FadeUp>
        </div>

        <FadeUp delay={0.2}>
          {/* Desktop Overlapping Cards, Mobile Stacked */}
          <div className="relative w-full max-w-[1000px] mx-auto flex flex-col md:block h-auto md:h-[540px] gap-8 md:gap-0">
            
            {/* The Old Way Card (Back/Left) */}
            <div className="group relative w-full md:w-[55%] md:absolute md:left-0 md:top-12 bg-[#050505] border border-[rgba(255,255,255,0.04)] rounded-[32px] p-8 md:p-12 shadow-2xl md:-rotate-2 md:origin-bottom-left transition-all duration-700 md:hover:-rotate-0 md:hover:z-30 md:hover:scale-[1.02]">
              <div className="absolute inset-0 bg-gradient-to-br from-black/50 to-transparent rounded-[32px] pointer-events-none"></div>
              
              <div className="relative z-10 opacity-60 group-hover:opacity-100 transition-opacity duration-500">
                <h3 className="font-display text-[24px] md:text-[32px] font-bold text-text-secondary mb-8 pb-6 border-b border-[rgba(255,255,255,0.05)]">
                  Traditional Setup
                </h3>
                
                <div className="flex flex-col gap-8">
                  <div className="flex gap-4 items-start">
                    <X className="text-[#FF5F56] shrink-0 mt-1" size={20} />
                    <div>
                      <p className="text-[18px] font-semibold text-text-primary mb-1">Massive Overhead</p>
                      <p className="text-[14px] text-text-tertiary leading-[1.6]">Crippling monthly rent, utilities, and physical infrastructure costs.</p>
                    </div>
                  </div>
                  <div className="flex gap-4 items-start">
                    <X className="text-[#FF5F56] shrink-0 mt-1" size={20} />
                    <div>
                      <p className="text-[18px] font-semibold text-text-primary mb-1">Geographic Limits</p>
                      <p className="text-[14px] text-text-tertiary leading-[1.6]">Restricted to hiring talent only within commuting distance.</p>
                    </div>
                  </div>
                  <div className="flex gap-4 items-start">
                    <X className="text-[#FF5F56] shrink-0 mt-1" size={20} />
                    <div>
                      <p className="text-[18px] font-semibold text-text-primary mb-1">Fragmented Operations</p>
                      <p className="text-[14px] text-text-tertiary leading-[1.6]">Data lost across endless physical paperwork and disjointed tools.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* The Operiq Way Card (Front/Right) */}
            <div className="group relative w-full md:w-[60%] md:absolute md:right-0 md:top-0 bg-[rgba(15,15,18,0.7)] backdrop-blur-3xl border border-[rgba(124,58,237,0.3)] rounded-[32px] p-8 md:p-12 shadow-[0_40px_100px_rgba(124,58,237,0.15)] z-20 md:rotate-1 md:origin-bottom-right transition-all duration-700 md:hover:rotate-0 md:hover:scale-[1.02]">
              {/* Inner Glow */}
              <div className="absolute inset-0 bg-gradient-to-br from-purple-primary/10 via-transparent to-transparent rounded-[32px] pointer-events-none"></div>
              {/* Top Highlight Line */}
              <div className="absolute top-0 left-[10%] right-[10%] h-[1px] bg-gradient-to-r from-transparent via-purple-light to-transparent opacity-50"></div>
              
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-8 pb-6 border-b border-[rgba(124,58,237,0.2)]">
                  <h3 className="font-display text-[24px] md:text-[32px] font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-purple-light">
                    KAAM DONE OS
                  </h3>
                  <div className="px-3 py-1 bg-purple-primary/20 border border-purple-primary/30 rounded-full">
                    <span className="text-[10px] font-bold text-purple-light tracking-widest uppercase">The Future</span>
                  </div>
                </div>
                
                <div className="flex flex-col gap-8">
                  <div className="flex gap-4 items-start">
                    <div className="w-6 h-6 rounded-full bg-green-accent/20 flex items-center justify-center shrink-0 mt-1 border border-green-accent/30 shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                      <Check className="text-green-accent" size={14} />
                    </div>
                    <div>
                      <p className="text-[18px] font-semibold text-white mb-1">Zero Overhead</p>
                      <p className="text-[14px] text-text-secondary leading-[1.6]">Operate a full-scale enterprise from a laptop. Maximize profit margins instantly.</p>
                    </div>
                  </div>
                  <div className="flex gap-4 items-start">
                    <div className="w-6 h-6 rounded-full bg-green-accent/20 flex items-center justify-center shrink-0 mt-1 border border-green-accent/30 shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                      <Check className="text-green-accent" size={14} />
                    </div>
                    <div>
                      <p className="text-[18px] font-semibold text-white mb-1">Global Scale</p>
                      <p className="text-[14px] text-text-secondary leading-[1.6]">Hire the top 1% of talent globally. Location is no longer a constraint.</p>
                    </div>
                  </div>
                  <div className="flex gap-4 items-start">
                    <div className="w-6 h-6 rounded-full bg-green-accent/20 flex items-center justify-center shrink-0 mt-1 border border-green-accent/30 shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                      <Check className="text-green-accent" size={14} />
                    </div>
                    <div>
                      <p className="text-[18px] font-semibold text-white mb-1">Unified Intelligence</p>
                      <p className="text-[14px] text-text-secondary leading-[1.6]">Every team, task, and metric perfectly synchronized in one brilliant dashboard.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </FadeUp>
      </div>
    </section>
  );
}
