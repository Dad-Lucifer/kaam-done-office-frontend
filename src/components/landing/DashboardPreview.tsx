import { FadeUp } from './FadeUp';
import { Calendar, Filter } from 'lucide-react';

export default function DashboardPreview() {
  return (
    <section className="py-12 md:py-20 w-full bg-elevated border-y border-[rgba(255,255,255,0.08)]">
      <div className="max-w-[1200px] mx-auto w-full px-6 md:px-12 lg:px-20">
        <div className="flex flex-col items-center text-center max-w-[720px] mx-auto mb-12">
          <FadeUp>
            <span className="text-[12px] font-semibold text-purple-light tracking-[0.1em] uppercase mb-4 block">
              Dashboard Preview
            </span>
          </FadeUp>
          <FadeUp delay={0.1}>
            <h2 className="font-display font-semibold text-[32px] md:text-[44px] leading-[1.15] tracking-[-0.02em] text-text-primary">
              Your Virtual Office, Visualized.
            </h2>
          </FadeUp>
        </div>

        <FadeUp delay={0.2}>
          <div className="w-full max-w-[1100px] mx-auto bg-base border border-[rgba(255,255,255,0.08)] rounded-2xl overflow-hidden shadow-2xl">
            {/* Top Bar Filters */}
            <div className="p-5 border-b border-[rgba(255,255,255,0.05)] flex flex-wrap items-center justify-between gap-4">
              <div className="flex gap-2">
                {['All Departments', 'Engineering', 'Design', 'Marketing'].map((dept, i) => (
                  <div key={dept} className={`px-4 py-1.5 rounded-full text-[13px] font-medium cursor-pointer ${i === 0 ? 'bg-[rgba(124,58,237,0.1)] text-purple-primary border border-purple-primary/30' : 'bg-surface text-text-secondary border border-transparent hover:text-text-primary'}`}>
                    {dept}
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-3">
                <div className="px-4 py-1.5 rounded-full bg-surface border border-[rgba(255,255,255,0.08)] text-[13px] text-text-secondary flex items-center gap-2">
                  <Calendar size={14} /> This Week
                </div>
                <div className="w-8 h-8 rounded-full bg-surface border border-[rgba(255,255,255,0.08)] flex items-center justify-center text-text-secondary">
                  <Filter size={14} />
                </div>
              </div>
            </div>

            <div className="p-6 bg-base flex flex-col gap-6">
              {/* Row 1: 5 stat cards */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {[
                  { l: 'Total Employees', v: '247' },
                  { l: 'Present Today', v: '220' },
                  { l: 'On Leave', v: '27' },
                  { l: 'Tasks Due', v: '142' },
                  { l: 'Avg Productivity', v: '94%' }
                ].map((stat, i) => (
                  <div key={i} className="bg-surface border border-[rgba(255,255,255,0.05)] rounded-xl p-4">
                    <div className="text-[12px] text-text-tertiary mb-1">{stat.l}</div>
                    <div className="text-[24px] font-bold text-text-primary">{stat.v}</div>
                  </div>
                ))}
              </div>

              {/* Row 2: Charts */}
              <div className="flex flex-col md:flex-row gap-6">
                <div className="flex-[65%] bg-surface border border-[rgba(255,255,255,0.05)] rounded-xl p-5 flex flex-col">
                  <div className="text-[14px] font-medium text-text-secondary mb-6">Weekly Attendance</div>
                  <div className="flex-1 flex items-end justify-between gap-2 md:gap-4 h-[160px]">
                    {[{d: 'Mon', h: 95}, {d: 'Tue', h: 92}, {d: 'Wed', h: 88}, {d: 'Thu', h: 96}, {d: 'Fri', h: 85}, {d: 'Sat', h: 20}, {d: 'Sun', h: 10}].map(day => (
                      <div key={day.d} className="flex-1 flex flex-col items-center gap-2 group">
                        <div className="text-[11px] text-purple-primary opacity-0 group-hover:opacity-100 transition-opacity">{day.h}%</div>
                        <div className="w-full bg-[rgba(255,255,255,0.03)] rounded-t-sm relative h-full flex items-end">
                          <div className="w-full bg-purple-primary rounded-t-sm opacity-80 hover:opacity-100 transition-opacity" style={{ height: `${day.h}%` }}></div>
                        </div>
                        <div className="text-[12px] text-text-tertiary">{day.d}</div>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="flex-[35%] bg-surface border border-[rgba(255,255,255,0.05)] rounded-xl p-5 flex flex-col items-center justify-center relative min-h-[200px]">
                  <div className="absolute top-5 left-5 text-[14px] font-medium text-text-secondary">Department Split</div>
                  <div className="w-[120px] h-[120px] rounded-full border-[12px] border-purple-primary mt-6 relative">
                    <div className="absolute inset-[-12px] rounded-full border-[12px] border-purple-light" style={{ clipPath: 'polygon(50% 50%, 100% 0, 100% 100%, 50% 100%)' }}></div>
                    <div className="absolute inset-[-12px] rounded-full border-[12px] border-green-accent" style={{ clipPath: 'polygon(50% 50%, 0 100%, 0 50%)' }}></div>
                  </div>
                </div>
              </div>

              {/* Row 3: Activity */}
              <div className="bg-surface border border-[rgba(255,255,255,0.05)] rounded-xl p-5">
                <div className="text-[14px] font-medium text-text-secondary mb-4">Recent Activity</div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 bg-base rounded-lg">
                       <div className="w-2 h-2 rounded-full bg-purple-primary"></div>
                       <div>
                         <div className="text-[13px] text-text-primary">System Update Completed</div>
                         <div className="text-[11px] text-text-tertiary">{i + 1}h ago</div>
                       </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        </FadeUp>
      </div>
    </section>
  );
}
