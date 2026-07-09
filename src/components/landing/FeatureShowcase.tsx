import { FadeUp } from './FadeUp';
import { ArrowRight, MoreHorizontal } from 'lucide-react';

export default function FeatureShowcase() {
  return (
    <section id="features" className="py-20 md:py-[120px] px-6 md:px-12 lg:px-20 max-w-[1200px] mx-auto w-full flex flex-col gap-6">
      
      {/* Card 1: Smart Dashboard */}
      <FadeUp>
        <div className="bg-elevated border border-[rgba(255,255,255,0.08)] rounded-[20px] p-8 md:p-12 flex flex-col lg:flex-row gap-12 items-center hover:border-[rgba(124,58,237,0.2)] hover:shadow-[0_0_30px_rgba(124,58,237,0.05)] transition-all duration-300">
          <div className="flex-1 max-w-[480px]">
            <span className="text-[12px] font-semibold text-purple-light tracking-[0.1em] uppercase mb-4 block">
              Smart Dashboard
            </span>
            <h3 className="font-display font-semibold text-[28px] md:text-[36px] leading-[1.2] tracking-[-0.02em] text-text-primary mb-4">
              See Everything. Miss Nothing.
            </h3>
            <p className="text-[16px] leading-[1.6] text-text-secondary mb-8">
              A live command center that gives you complete visibility into your virtual office — attendance, tasks, performance, and more — in one glance.
            </p>
            <a href="#" className="inline-flex items-center gap-2 text-[15px] font-medium text-purple-light hover:underline underline-offset-4 decoration-purple-light/30">
              Explore Dashboard <ArrowRight size={16} />
            </a>
          </div>
          
          {/* Visual: Charts */}
          <div className="flex-1 w-full bg-base rounded-xl border border-[rgba(255,255,255,0.08)] p-6 shadow-xl overflow-hidden h-[300px] flex flex-col gap-6">
            {/* Fake Bar Chart */}
            <div className="flex-1 flex items-end justify-between gap-2 px-2">
              {[40, 70, 45, 90, 65, 80, 50].map((h, i) => (
                <div key={i} className="w-full bg-surface rounded-t-md relative group">
                  <div 
                    className="absolute bottom-0 w-full bg-purple-primary rounded-t-md opacity-80 group-hover:opacity-100 transition-opacity"
                    style={{ height: `${h}%` }}
                  ></div>
                </div>
              ))}
            </div>
            {/* Fake Line Chart area (just blocks) */}
            <div className="h-[80px] flex gap-4">
              <div className="flex-1 bg-surface rounded-lg p-3 flex flex-col justify-between">
                <div className="w-8 h-2 bg-[rgba(255,255,255,0.1)] rounded-full"></div>
                <div className="w-16 h-4 bg-purple-primary rounded-full opacity-60"></div>
              </div>
              <div className="flex-[2] bg-surface rounded-lg p-3 flex flex-col justify-between">
                 <div className="w-12 h-2 bg-[rgba(255,255,255,0.1)] rounded-full"></div>
                 <div className="w-full h-4 bg-green-accent rounded-full opacity-60"></div>
              </div>
            </div>
          </div>
        </div>
      </FadeUp>

      {/* Card 2: Team Operations */}
      <FadeUp delay={0.1}>
        <div className="bg-elevated border border-[rgba(255,255,255,0.08)] rounded-[20px] p-8 md:p-12 flex flex-col-reverse lg:flex-row gap-12 items-center hover:border-[rgba(124,58,237,0.2)] hover:shadow-[0_0_30px_rgba(124,58,237,0.05)] transition-all duration-300">
          
          {/* Visual: Team List */}
          <div className="flex-1 w-full bg-base rounded-xl border border-[rgba(255,255,255,0.08)] p-1 shadow-xl overflow-hidden h-[300px] flex flex-col">
            <div className="p-4 border-b border-[rgba(255,255,255,0.05)] flex items-center justify-between">
              <div className="text-[14px] font-medium text-text-primary">Engineering Team</div>
              <MoreHorizontal size={16} className="text-text-tertiary" />
            </div>
            <div className="flex flex-col p-2 gap-1">
              {[
                {n: 'David Chen', r: 'Frontend Lead', s: 'green-accent', bg: 'bg-[#3B82F6]'},
                {n: 'Priya Sharma', r: 'Backend Dev', s: 'green-accent', bg: 'bg-[#7C3AED]'},
                {n: 'Michael Ross', r: 'DevOps', s: 'text-tertiary', bg: 'bg-[#D4AF37]'},
                {n: 'Elena Rodriguez', r: 'UI Designer', s: 'green-accent', bg: 'bg-[#FF5F56]'}
              ].map((member, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg hover:bg-[rgba(255,255,255,0.02)] transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-[13px] font-bold ${member.bg} opacity-90`}>
                        {member.n.charAt(0)}
                      </div>
                      <div className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-base bg-${member.s}`}></div>
                    </div>
                    <div>
                      <div className="text-[14px] font-medium text-text-primary">{member.n}</div>
                      <div className="text-[12px] text-text-tertiary">{member.r}</div>
                    </div>
                  </div>
                  <div className="px-3 py-1 rounded-full bg-surface border border-[rgba(255,255,255,0.05)] text-[11px] text-text-secondary">
                    Active
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex-1 max-w-[480px]">
            <span className="text-[12px] font-semibold text-purple-light tracking-[0.1em] uppercase mb-4 block">
              Team Operations
            </span>
            <h3 className="font-display font-semibold text-[28px] md:text-[36px] leading-[1.2] tracking-[-0.02em] text-text-primary mb-4">
              Manage People, Not Paperwork.
            </h3>
            <p className="text-[16px] leading-[1.6] text-text-secondary mb-8">
              From onboarding to daily check-ins, Operiq automates the repetitive so you can focus on what matters — your people.
            </p>
            <a href="#" className="inline-flex items-center gap-2 text-[15px] font-medium text-purple-light hover:underline underline-offset-4 decoration-purple-light/30">
              See How It Works <ArrowRight size={16} />
            </a>
          </div>
        </div>
      </FadeUp>
      
    </section>
  );
}
