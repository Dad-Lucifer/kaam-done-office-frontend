import React from 'react';
import { createPortal } from 'react-dom';
import { AlertCircle, ArrowLeft, Zap, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface SubscriptionLimitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpgrade: () => void;
  resourceName: string;
}

const SubscriptionLimitModal: React.FC<SubscriptionLimitModalProps> = ({
  isOpen,
  onClose,
  onUpgrade,
  resourceName,
}) => {
  if (!isOpen) return null;

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-[#050505]/80 backdrop-blur-md"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20, rotateX: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0, rotateX: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20, rotateX: -10 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          style={{ perspective: 1000 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-md rounded-[24px] bg-[rgba(15,15,18,0.75)] backdrop-blur-3xl border border-[rgba(255,255,255,0.08)] shadow-[0_30px_80px_rgba(0,0,0,0.8)] overflow-hidden"
        >
          {/* Holographic Top Banner / Glow */}
          <div className="absolute top-0 left-0 right-0 h-[150px] rounded-t-[24px] overflow-hidden opacity-80 pointer-events-none z-0">
            <div className="absolute -top-[100px] -left-[100px] w-[300px] h-[300px] bg-[rgba(124,58,237,0.35)] blur-[70px] rounded-full mix-blend-screen animate-[pulse_4s_ease-in-out_infinite]" />
            <div className="absolute -top-[50px] -right-[50px] w-[200px] h-[200px] bg-[rgba(239,68,68,0.2)] blur-[60px] rounded-full mix-blend-screen" />
            {/* Cyberpunk Grid Overlay */}
            <div 
              className="absolute inset-0 opacity-30 mix-blend-overlay"
              style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '16px 16px' }}
            />
          </div>

          <div className="relative z-10 p-8 pt-10">
            {/* Close button top right */}
            <button 
              onClick={onClose}
              className="absolute top-4 right-4 text-white/40 hover:text-white transition-colors p-1 bg-white/5 rounded-full hover:bg-white/10"
            >
              <X size={18} />
            </button>

            {/* Centered Icon with pinging circles */}
            <div className="relative mx-auto w-16 h-16 flex items-center justify-center mb-6">
              <div className="absolute inset-0 bg-red-500/20 rounded-full animate-ping opacity-60 duration-1000"></div>
              <div className="absolute -inset-2 bg-purple-500/10 rounded-full animate-pulse blur-md"></div>
              <div className="relative w-16 h-16 rounded-full bg-gradient-to-b from-[rgba(239,68,68,0.15)] to-[rgba(239,68,68,0.05)] flex items-center justify-center border border-red-500/40 shadow-[0_0_30px_rgba(239,68,68,0.3)]">
                <AlertCircle className="w-8 h-8 text-red-500 drop-shadow-[0_0_10px_rgba(239,68,68,0.8)]" />
              </div>
            </div>

            <h2 className="text-center text-[26px] font-display font-black tracking-wide text-transparent bg-clip-text bg-gradient-to-b from-white via-white/90 to-white/40 mb-3 drop-shadow-[0_2px_10px_rgba(255,255,255,0.2)]">
              CAPACITY REACHED
            </h2>
            
            <p className="text-center text-text-tertiary mb-8 leading-[1.6] text-[15px]">
              You have maxed out your allocation for <span className="text-white font-bold tracking-wider uppercase px-1 py-0.5 rounded bg-white/5 border border-white/10">{resourceName}</span>. 
              <br className="mb-2" />
              Elevate your workspace to the next level to unlock unlimited potential.
            </p>
            
            <div className="flex flex-col gap-3 mt-4">
              <button
                onClick={onUpgrade}
                className="group relative w-full flex items-center justify-center h-14 rounded-xl bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.1)] overflow-hidden transition-all hover:border-purple-primary/50 hover:shadow-[0_0_30px_rgba(124,58,237,0.3)]"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-purple-primary/20 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
                <div className="relative w-full h-full flex items-center justify-center gap-2">
                  <Zap size={16} className="text-purple-light opacity-80 group-hover:opacity-100 transition-opacity fill-purple-light/50 drop-shadow-[0_0_8px_rgba(167,139,250,0.8)]" />
                  <span className="font-display font-bold text-[14px] tracking-[0.2em] uppercase text-white/90 group-hover:text-white transition-colors drop-shadow-md">
                    Initiate Upgrade
                  </span>
                </div>
              </button>

              <button
                onClick={onClose}
                className="w-full flex items-center justify-center gap-2 h-12 rounded-xl bg-transparent text-text-tertiary hover:text-white hover:bg-[rgba(255,255,255,0.05)] font-medium transition-all text-[13px] uppercase tracking-wider group"
              >
                <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
                Return to Base
              </button>
            </div>
          </div>

          <style dangerouslySetInnerHTML={{__html: `
            @keyframes shimmer {
              100% { transform: translateX(100%); }
            }
          `}} />
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
};

export default SubscriptionLimitModal;
