import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Check, Zap, Sparkles, Shield, Crown, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { createOrder } from '../../api/payments';
import { useSubscription } from '../../context/SubscriptionContext';

declare global {
  interface Window {
    Razorpay: any;
  }
}

interface UpgradeModalProps {
  onClose: () => void;
  onSuccess: (planName: string) => void;
}

// Map package name to planId used in backend
const PLAN_ID_MAP: Record<string, string> = {
  Essential: 'essential',
  Growth:    'growth',
  Scale:     'scale',
};

const packages = [
  {
    name: 'Essential',
    title: 'Essential',
    icon: Shield,
    price: 250,
    period: '/month',
    color: '#57dc99',
    features: [
      'Up to 4 members capability',
      '3 categories & 3 secure chat rooms',
      '1 dedicated voice channel',
      'Basic role management protocol',
      'Standard cloud synchronization',
    ],
    tag: 'Core System',
  },
  {
    name: '',
    title: 'Growth',
    icon: Zap,
    price: 799,
    period: '/month',
    color: '#c9a227',
    features: [
      'Up to 15 members capability',
      '10 categories & 15 secure chat rooms',
      '5 dedicated voice channels',
      'Advanced AI HR',
      '1 Advance Task manager',
      'Priority routing support',
    ],
    tag: 'Recommended Expansion',
  },
  {
    name: 'Scale',
    title: 'Scale',
    icon: Crown,
    price: 1999,
    period: '/month',
    color: '#c084fc',
    features: [
      'Unlimited members capability',
      'Infinite categories & rooms',
      'Unrestricted voice channels',
      'Advanced admin overrides',
      'AI-powered analytics HR',
      'Unlimited Advance Task managers',
      'Premium 24/7 hyper-support',
    ],
    tag: 'Maximum Override',
  },
];

const UpgradeModal: React.FC<UpgradeModalProps> = ({ onClose, onSuccess }) => {
  const [activeIndex, setActiveIndex] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const activePkg = packages[activeIndex];
  const { refetch: refetchSubscription } = useSubscription();

  const handleUpgradeClick = async (pkg: typeof packages[0], e: React.MouseEvent) => {
    e.stopPropagation();
    if (isProcessing) return;
    
    try {
      setIsProcessing(true);
      const orderData = await createOrder({ amount: pkg.price * 100, planId: PLAN_ID_MAP[pkg.name] });
      
      if (!orderData.success || !orderData.order_id) {
        console.error('Failed to create order:', orderData.message);
        setIsProcessing(false);
        return;
      }

      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_Sy2wxO64TxSBRa',
        amount: orderData.amount,
        currency: orderData.currency || 'INR',
        name: 'Obsidian OS',
        description: pkg.title,
        order_id: orderData.order_id,
        handler: async function (response: any) {
          try {
            // Server-side signature verification + subscription activation in one call
            const token = sessionStorage.getItem('accessToken');
            const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000';
            const verifyRes = await fetch(`${apiBase}/api/payments/verify-payment`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
              },
              body: JSON.stringify({
                razorpay_order_id:   response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature:  response.razorpay_signature,
                planId: PLAN_ID_MAP[pkg.name],
              }),
            });

            const verifyData = await verifyRes.json();

            if (!verifyRes.ok || !verifyData.success) {
              console.error('[UpgradeModal] Payment verification failed:', verifyData.message);
              alert('Payment verification failed. Please contact support.');
              return;
            }

            // Refresh subscription context so UI updates immediately
            await refetchSubscription();
            onSuccess(pkg.name);
          } catch (verifyErr) {
            console.error('[UpgradeModal] Error during verification:', verifyErr);
            alert('Payment processed but verification failed. Please refresh.');
          } finally {
            setIsProcessing(false);
          }
        },
        prefill: {
          name: 'User',
          email: 'user@example.com',
        },
        theme: {
          color: pkg.color,
        },
        modal: {
          ondismiss: () => setIsProcessing(false),
        },
      };
      
      if (window.Razorpay) {
        const rzp = new window.Razorpay(options);
        rzp.on('payment.failed', function (response: any) {
          console.error('Payment failed', response.error);
          setIsProcessing(false);
        });
        rzp.open();
      } else {
        console.error('Razorpay SDK not loaded');
        setIsProcessing(false);
      }
    } catch (err) {
      console.error('Error initiating payment:', err);
      setIsProcessing(false);
    }
  };

  const handleNext = () => {
    setActiveIndex((prev) => (prev + 1) % packages.length);
  };

  const handlePrev = () => {
    setActiveIndex((prev) => (prev - 1 + packages.length) % packages.length);
  };

  return createPortal(
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex items-center justify-center bg-[#020204]/90 backdrop-blur-2xl overflow-hidden"
    >
      {/* Immersive Dynamic Background Glow */}
      <div 
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vw] h-[80vh] blur-[150px] opacity-20 pointer-events-none transition-colors duration-1000 ease-in-out"
        style={{ backgroundColor: activePkg.color }}
      />

      {/* Grid overlay for spatial depth */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)', backgroundSize: '40px 40px', perspective: '1000px', transform: 'rotateX(60deg) scale(2) translateY(-200px)' }}
      />

      <div className="absolute top-12 left-1/2 -translate-x-1/2 text-center z-50 pointer-events-none">
        <h2 className="font-display font-black text-5xl text-white tracking-widest uppercase drop-shadow-2xl">
          System Core Uplink
        </h2>
        <p className="font-sans text-white/40 tracking-[0.3em] uppercase text-sm mt-2">
          Select operational tier
        </p>
      </div>

      {/* 3D Carousel Container */}
      <div className="relative w-full max-w-7xl h-[750px] flex items-center justify-center mt-8" style={{ perspective: '1500px' }}>
        
        <AnimatePresence initial={false}>
          {packages.map((pkg, idx) => {
            const offset = idx - activeIndex;
            const isCenter = offset === 0;
            const isLeft = offset < 0 || (activeIndex === 0 && idx === packages.length - 1);
            const isRight = offset > 0 || (activeIndex === packages.length - 1 && idx === 0);

            // Calculate 3D transforms based on position
            let x = 0;
            let z = 0;
            let rotateY = 0;
            let scale = 1;
            let opacity = 1;
            let zIndex = 10;
            let blur = 'blur(0px)';

            if (isCenter) {
              x = 0;
              z = 100;
              rotateY = 0;
              scale = 1.05;
              opacity = 1;
              zIndex = 30;
              blur = 'blur(0px)';
            } else if (isLeft) {
              x = -400;
              z = -200;
              rotateY = 30;
              scale = 0.85;
              opacity = 0.4;
              zIndex = 10;
              blur = 'blur(4px)';
            } else if (isRight) {
              x = 400;
              z = -200;
              rotateY = -30;
              scale = 0.85;
              opacity = 0.4;
              zIndex = 10;
              blur = 'blur(4px)';
            }

            const Icon = pkg.icon;

            return (
              <motion.div
                key={pkg.name}
                initial={false}
                animate={{ 
                  x, 
                  z, 
                  rotateY, 
                  scale, 
                  opacity, 
                  zIndex,
                  filter: blur
                }}
                transition={{ type: 'spring', stiffness: 200, damping: 25, mass: 1 }}
                onClick={() => {
                  if (!isCenter) {
                    setActiveIndex(idx);
                  }
                }}
                className={`absolute w-[400px] h-[650px] rounded-[32px] overflow-hidden flex flex-col p-8 transition-shadow duration-500 ${
                  isCenter ? 'cursor-default' : 'cursor-pointer hover:opacity-60'
                }`}
                style={{ 
                  backgroundColor: 'rgba(15,15,18,0.7)', 
                  backdropFilter: 'blur(30px)',
                  border: isCenter ? `1px solid ${pkg.color}80` : '1px solid rgba(255,255,255,0.1)',
                  boxShadow: isCenter ? `0 0 80px ${pkg.color}30, inset 0 0 30px ${pkg.color}10` : '0 20px 40px rgba(0,0,0,0.8)'
                }}
              >
                {/* Holographic Header */}
                <div className="flex items-center justify-between mb-6">
                  <div 
                    className="px-3 py-1 rounded text-[10px] font-bold tracking-widest uppercase border"
                    style={{ borderColor: `${pkg.color}40`, color: pkg.color, backgroundColor: `${pkg.color}10` }}
                  >
                    {pkg.tag}
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                    <Icon size={24} style={{ color: pkg.color }} />
                  </div>
                </div>

                <h3 className="font-display font-black text-4xl text-white mb-1">
                  {pkg.title}
                </h3>
                
                <div className="flex items-baseline gap-1 mb-6">
                  <span className="font-display font-light text-2xl text-white/40">₹</span>
                  <span className="font-display font-black text-5xl" style={{ color: pkg.color, textShadow: `0 0 20px ${pkg.color}40` }}>
                    {pkg.price}
                  </span>
                  <span className="font-sans font-medium text-xs text-white/30 uppercase tracking-widest ml-1">
                    {pkg.period}
                  </span>
                </div>

                <div className="w-full h-[1px] bg-white/10 mb-6 shrink-0" />

                <ul className="flex flex-col gap-3.5 flex-1 overflow-y-auto custom-scrollbar pr-2 mb-4">
                  {pkg.features.map((feat, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <div className="mt-0.5 w-5 h-5 rounded-full flex items-center justify-center bg-white/5 border border-white/10 shrink-0">
                        <Check size={10} style={{ color: pkg.color }} />
                      </div>
                      <span className="font-sans text-[13px] text-white/70 leading-snug">{feat}</span>
                    </li>
                  ))}
                </ul>

                <button 
                  onClick={(e) => isCenter ? handleUpgradeClick(pkg, e) : setActiveIndex(idx)}
                  className={`relative shrink-0 mt-auto w-full h-14 rounded-xl overflow-hidden font-display font-bold text-[13px] tracking-[0.2em] uppercase transition-all duration-300 group ${
                    isCenter ? 'hover:scale-[1.02]' : ''
                  }`}
                  style={{ 
                    backgroundColor: isCenter ? `${pkg.color}15` : 'rgba(255,255,255,0.05)', 
                    border: isCenter ? `1px solid ${pkg.color}60` : '1px solid rgba(255,255,255,0.1)',
                    color: isCenter ? pkg.color : 'rgba(255,255,255,0.5)'
                  }}
                >
                  {isCenter && (
                    <>
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
                      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{ boxShadow: `inset 0 0 30px ${pkg.color}40` }} />
                    </>
                  )}
                  <span className="relative z-10 flex items-center justify-center gap-2" style={{ textShadow: isCenter ? `0 0 10px ${pkg.color}80` : 'none' }}>
                    {isCenter ? <><Sparkles size={16} /> Authorize Override</> : 'Select Module'}
                  </span>
                </button>

              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* Carousel Navigation Arrows */}
        <div className="absolute top-1/2 -translate-y-1/2 w-[900px] flex justify-between z-40 pointer-events-none">
          <button 
            onClick={handlePrev}
            className="w-16 h-16 rounded-full bg-[rgba(20,20,24,0.6)] backdrop-blur-md border border-white/10 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 hover:border-white/30 transition-all pointer-events-auto hover:scale-110 -ml-12"
          >
            <ChevronLeft size={24} />
          </button>
          <button 
            onClick={handleNext}
            className="w-16 h-16 rounded-full bg-[rgba(20,20,24,0.6)] backdrop-blur-md border border-white/10 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 hover:border-white/30 transition-all pointer-events-auto hover:scale-110 -mr-12"
          >
            <ChevronRight size={24} />
          </button>
        </div>

      </div>

      {/* Close Button */}
      <button 
        onClick={onClose}
        className="absolute top-8 right-8 w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/50 hover:text-white hover:bg-[#f87171]/20 hover:border-[#f87171]/40 hover:rotate-90 transition-all z-[100]"
      >
        <X size={20} />
      </button>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes shimmer {
          100% { transform: translateX(100%); }
        }
      `}} />
    </motion.div>,
    document.body
  );
};

export default UpgradeModal;
