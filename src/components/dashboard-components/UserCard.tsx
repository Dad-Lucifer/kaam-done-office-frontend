import React, { useRef, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Edit2, ChevronRight, LogOut, Hash, Zap, Sparkles, Activity } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import UpgradeModal from './UpgradeModal';
import { useSubscription } from '../../context/SubscriptionContext';
import { memberLogout } from '../../api/auditLogs';

interface UserCardProps {
  onClose: () => void;
  avatarUrl?: string;
  displayName?: string;
  handle?: string;
  roleMessage?: string;
  isAdmin?: boolean;
  isTeamMember?: boolean;
}

const UserCard: React.FC<UserCardProps> = ({ onClose, avatarUrl, displayName, handle, roleMessage, isAdmin, isTeamMember }) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { subscription, refetch: refetchSubscription } = useSubscription();
  
  const [currentStatus, setCurrentStatus] = useState('Online');
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  // Derive plan name from subscription context (not localStorage)
  const activePlan = subscription?.planName || 'Free';

  const handlePlanSuccess = async (_planName: string) => {
    // Context already refreshed inside UpgradeModal handler
    // but refetch here as a safety net
    await refetchSubscription();
    setShowUpgradeModal(false);
  };

  const handleSignOut = async () => {
    // If a team member, call the logout API first so logout time is recorded in attendance-logs
    if (isTeamMember) {
      try {
        await memberLogout();
      } catch (e) {
        console.warn('[UserCard] member-logout API failed (will still sign out):', e);
      }
    }
    sessionStorage.removeItem('accessToken');
    sessionStorage.removeItem('isTeamMember');
    navigate('/login', { replace: true });
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      // CRITICAL FIX: If the upgrade modal is open, DO NOT close the UserCard on outside clicks!
      // The UpgradeModal is rendered in a React Portal (document.body).
      // Any clicks inside the modal will bubble to document and trigger this listener.
      if (showUpgradeModal) return;

      if (cardRef.current && !cardRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose, showUpgradeModal]);

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'Online': return '#57dc99'; 
      case 'Idle': return '#fbbf24';   
      case 'Working': return '#c084fc'; 
      case 'DND': return '#f87171';    
      default: return '#57dc99';
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: -20, rotateY: 10 }}
      animate={{ opacity: 1, x: 0, rotateY: 0 }}
      exit={{ opacity: 0, x: -20, rotateY: -10 }}
      transition={{ type: 'spring', stiffness: 200, damping: 20 }}
      style={{ perspective: 1000 }}
      className="absolute bottom-[80px] left-[80px] w-[360px] z-[100]"
    >
      <div 
        ref={cardRef}
        className="relative w-full rounded-[24px] bg-[rgba(10,10,12,0.4)] backdrop-blur-[40px] border border-[rgba(255,255,255,0.08)] shadow-[0_30px_80px_rgba(0,0,0,0.8)] overflow-visible"
      >
        {/* Holographic Top Banner */}
        <div className="absolute top-0 left-0 right-0 h-[120px] rounded-t-[24px] overflow-hidden opacity-80 pointer-events-none">
          <div className="absolute -top-[100px] -left-[100px] w-[300px] h-[300px] bg-[rgba(124,58,237,0.3)] blur-[60px] rounded-full mix-blend-screen animate-pulse" />
          <div className="absolute -top-[50px] right-[0px] w-[200px] h-[200px] bg-[rgba(87,220,153,0.15)] blur-[50px] rounded-full mix-blend-screen" />
          
          {/* Cyberpunk Grid Overlay */}
          <div 
            className="absolute inset-0 opacity-20"
            style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '20px 20px' }}
          />
        </div>

        {/* Floating Avatar */}
        <div className="relative pt-[20px] px-6 flex items-start justify-between z-10">
          <div className="relative group">
            {/* Rotating Tech Ring */}
            <div className="absolute -inset-2 rounded-full border border-dashed border-[rgba(124,58,237,0.4)] group-hover:animate-[spin_4s_linear_infinite]" />
            <div className="absolute -inset-1 rounded-full border border-[rgba(87,220,153,0.2)] animate-[spin_8s_linear_infinite_reverse]" />
            
            <div className="relative w-[84px] h-[84px] rounded-full bg-[rgba(20,20,24,1)] border-2 border-[rgba(255,255,255,0.1)] flex items-center justify-center overflow-hidden shadow-2xl z-10">
              {avatarUrl ? (
                <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="font-display font-bold text-4xl text-transparent bg-clip-text bg-gradient-to-br from-purple-light to-white">
                  {displayName?.[0]?.toUpperCase() || 'U'}
                </span>
              )}
              {/* Scanline effect on hover */}
              <div className="absolute top-0 left-0 w-full h-[2px] bg-white/40 opacity-0 group-hover:opacity-100 shadow-[0_0_10px_white] group-hover:animate-[scan_1.5s_ease-in-out_infinite]" />
            </div>

            {/* Futuristic Status Indicator */}
            <div className="absolute bottom-0 right-0 z-20 bg-[#0a0a0c] p-1 rounded-full border border-[rgba(255,255,255,0.1)]">
              <div className="relative flex items-center justify-center w-4 h-4">
                <div 
                  className="absolute inset-0 rounded-full animate-ping opacity-50"
                  style={{ backgroundColor: getStatusColor(currentStatus) }}
                />
                <div 
                  className="relative w-3 h-3 rounded-full"
                  style={{ backgroundColor: getStatusColor(currentStatus), boxShadow: `0 0 10px ${getStatusColor(currentStatus)}` }}
                />
              </div>
            </div>
          </div>

          {/* Quick Actions top right */}
          <div className="flex gap-2 mt-2">
            <button className="w-8 h-8 rounded-full bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.05)] text-text-tertiary hover:text-white hover:bg-[rgba(255,255,255,0.1)] flex items-center justify-center transition-all">
              <Edit2 size={12} />
            </button>
            <button onClick={handleSignOut} className="w-8 h-8 rounded-full bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.05)] text-text-tertiary hover:text-[#f87171] hover:bg-[rgba(248,113,113,0.15)] flex items-center justify-center transition-all">
              <LogOut size={12} className="-ml-0.5" />
            </button>
          </div>
        </div>

        {/* User Info */}
        <div className="relative z-10 px-6 pt-4 pb-6">
          <div className="flex items-center gap-3">
            <h2 className="font-display font-extrabold text-[24px] text-white tracking-wide drop-shadow-[0_2px_10px_rgba(255,255,255,0.2)]">
              {displayName || 'DJ SMASH X'}
            </h2>
            {activePlan !== 'Free' && (
              <div className="px-2 py-0.5 rounded-md bg-[rgba(212,175,55,0.15)] border border-[rgba(212,175,55,0.4)] shadow-[0_0_15px_rgba(212,175,55,0.2)] flex items-center gap-1">
                <Zap size={10} className="text-gold" />
                <span className="text-[9px] font-bold tracking-widest text-gold uppercase">{activePlan}</span>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-2 mt-0.5 text-text-tertiary font-medium">
            <span className="text-[13px] tracking-widest uppercase">@{handle || 'djsmashx'}</span>
            <span className="w-1 h-1 rounded-full bg-white/20" />
            <div className="flex items-center gap-1 text-[11px] uppercase tracking-wider text-purple-light/80">
              <Activity size={10} /> ID: 9482X
            </div>
          </div>

          {roleMessage && (
            <div className="mt-4 px-3 py-2 rounded-lg bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)] text-[13px] text-white/70 italic border-l-2 border-l-purple-light">
              "{roleMessage}"
            </div>
          )}

          {/* Upgrade Button (Sci-Fi style) */}
          {isAdmin && (
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setShowUpgradeModal(true);
              }}
              className="group relative w-full mt-6 h-12 rounded-xl bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.1)] overflow-hidden transition-all hover:border-gold/50"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-gold/10 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
              <div className="relative w-full h-full flex items-center justify-center gap-2">
                <Sparkles size={14} className="text-gold opacity-70 group-hover:opacity-100 transition-opacity" />
                <span className="font-display font-bold text-[12px] tracking-[0.2em] uppercase text-white/80 group-hover:text-gold transition-colors drop-shadow-md">
                  Upgrade System
                </span>
              </div>
            </button>
          )}

          {/* Action Menu List */}
          <div className="mt-6 flex flex-col gap-1">
            <div className="text-[10px] font-bold tracking-widest uppercase text-white/30 mb-1 px-1">Network Status</div>
            
            <div className="relative">
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setStatusDropdownOpen(!statusDropdownOpen);
                }}
                className="w-full flex items-center justify-between px-3 py-2.5 bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.04)] rounded-xl hover:bg-[rgba(255,255,255,0.06)] transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-6 h-6 rounded bg-[rgba(0,0,0,0.3)]">
                    <div 
                      className="w-2 h-2 rounded-full shadow-[0_0_8px_currentColor]" 
                      style={{ backgroundColor: getStatusColor(currentStatus), color: getStatusColor(currentStatus) }}
                    />
                  </div>
                  <span className="font-sans text-[13px] text-white/80 font-medium">{currentStatus}</span>
                </div>
                <ChevronRight size={14} className={`text-white/40 transition-transform ${statusDropdownOpen ? 'rotate-90' : ''}`} />
              </button>

              <AnimatePresence>
                {statusDropdownOpen && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="absolute top-full left-0 w-full mt-1 bg-[rgba(20,20,24,0.9)] backdrop-blur-xl border border-[rgba(255,255,255,0.08)] rounded-xl overflow-hidden z-20"
                  >
                    <div className="p-1 flex flex-col">
                      {['Online', 'Idle', 'Working', 'DND'].map((status) => (
                        <button 
                          key={status} 
                          onClick={(e) => { 
                            e.stopPropagation();
                            setCurrentStatus(status); 
                            setStatusDropdownOpen(false); 
                          }}
                          className="flex items-center gap-3 px-3 py-2 text-[12px] font-medium text-white/60 hover:text-white hover:bg-[rgba(255,255,255,0.05)] rounded-lg transition-all"
                        >
                          <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: getStatusColor(status), boxShadow: `0 0 5px ${getStatusColor(status)}` }} />
                          {status}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <button className="w-full flex items-center justify-between px-3 py-2.5 mt-1 bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.04)] rounded-xl hover:bg-[rgba(255,255,255,0.06)] transition-all group">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-6 h-6 rounded bg-[rgba(0,0,0,0.3)] text-white/40 group-hover:text-purple-light transition-colors">
                  <Hash size={12} />
                </div>
                <span className="font-sans text-[13px] text-white/80 font-medium">Copy User ID</span>
              </div>
            </button>
          </div>
        </div>

      </div>

      {showUpgradeModal && (
        <UpgradeModal 
          onClose={() => setShowUpgradeModal(false)}
          onSuccess={handlePlanSuccess}
        />
      )}
      
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes scan {
          0% { transform: translateY(0); }
          50% { transform: translateY(84px); }
          100% { transform: translateY(0); }
        }
        @keyframes shimmer {
          100% { transform: translateX(100%); }
        }
      `}} />
    </motion.div>
  );
};

export default UserCard;
