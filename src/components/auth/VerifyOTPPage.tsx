import {
  useState,
  useRef,
  useEffect,
  type KeyboardEvent,
  type ClipboardEvent,
  type FormEvent,
} from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { verifyOTP, resendOTP } from '../../api/auth';
import '../../styles/globals.css';

const OTP_LENGTH = 6;
const RESEND_COOLDOWN_SECONDS = 60;

export default function VerifyOTPPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const email = searchParams.get('email') || '';

  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [globalError, setGlobalError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  useEffect(() => {
    if (!email) navigate('/signup');
  }, [email, navigate]);

  const otpCode = digits.join('');

  function handleDigitChange(index: number, value: string) {
    const digit = value.replace(/\D/g, '').slice(-1);
    const updated = [...digits];
    updated[index] = digit;
    setDigits(updated);
    if (globalError) setGlobalError('');

    if (digit && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handleKeyDown(index: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace') {
      if (digits[index]) {
        const updated = [...digits];
        updated[index] = '';
        setDigits(updated);
      } else if (index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handlePaste(e: ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH);
    if (!pasted) return;

    const updated = Array(OTP_LENGTH).fill('');
    for (let i = 0; i < pasted.length; i++) {
      updated[i] = pasted[i];
    }
    setDigits(updated);

    const nextIndex = Math.min(pasted.length, OTP_LENGTH - 1);
    inputRefs.current[nextIndex]?.focus();
  }

  async function handleVerify(e: FormEvent) {
    e.preventDefault();
    if (otpCode.length < OTP_LENGTH) {
      setGlobalError(`Please enter all ${OTP_LENGTH} digits.`);
      return;
    }

    setIsVerifying(true);
    setGlobalError('');
    setSuccessMessage('');

    try {
      await verifyOTP({ email: email.trim(), code: otpCode });
      setSuccessMessage('Email verified! Redirecting to login…');
      setTimeout(() => navigate('/login'), 1800);
    } catch (error) {
      setGlobalError(error instanceof Error ? error.message : 'Verification failed. Please try again.');
      setDigits(Array(OTP_LENGTH).fill(''));
      inputRefs.current[0]?.focus();
    } finally {
      setIsVerifying(false);
    }
  }

  async function handleResend() {
    if (resendCooldown > 0 || isResending) return;

    setIsResending(true);
    setGlobalError('');
    setSuccessMessage('');

    try {
      await resendOTP({ email });
      setSuccessMessage('A new code has been sent to your email.');
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
      setDigits(Array(OTP_LENGTH).fill(''));
      inputRefs.current[0]?.focus();
    } catch (error) {
      setGlobalError(error instanceof Error ? error.message : 'Failed to resend code. Please try again.');
    } finally {
      setIsResending(false);
    }
  }

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-[#020204]">
      {/* Deep Atmospheric Background (from Hero) */}
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

      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-[480px] p-8 md:p-12 mx-4 bg-[rgba(10,10,12,0.6)] backdrop-blur-3xl border border-[rgba(255,255,255,0.08)] rounded-[32px] shadow-[0_40px_80px_rgba(0,0,0,0.6)] flex flex-col items-center text-center"
      >
        {/* Brand */}
        <Link to="/" className="flex items-baseline font-display font-bold text-[24px] text-text-primary mb-8">
          KAAM DONE<span className="w-1.5 h-1.5 rounded-full bg-purple-primary ml-[2px]"></span>
        </Link>
        
        {/* Icon */}
        <div className="w-16 h-16 rounded-[20px] bg-gradient-to-br from-purple-primary/20 to-purple-light/10 border border-purple-primary/30 flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(124,58,237,0.2)]">
          <span className="text-3xl" aria-hidden="true">✉️</span>
        </div>

        <h1 className="font-display font-bold text-3xl text-white tracking-tight mb-3">
          Verify your email
        </h1>
        
        <p className="text-[15px] text-text-secondary leading-relaxed mb-8">
          We've sent a 6-digit code to<br />
          <strong className="text-white font-medium">{email || 'your email address'}</strong>
        </p>

        {/* Banners */}
        {globalError && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="w-full p-3 mb-6 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm flex items-center gap-2 text-left">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            {globalError}
          </motion.div>
        )}
        {successMessage && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="w-full p-3 mb-6 bg-green-500/10 border border-green-500/20 rounded-xl text-green-400 text-sm flex items-center gap-2 text-left">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            {successMessage}
          </motion.div>
        )}

        {/* Form */}
        <form onSubmit={handleVerify} className="w-full flex flex-col items-center">
          
          {/* OTP Inputs */}
          <div className="flex justify-center gap-2 md:gap-3 mb-8 w-full">
            {digits.map((digit, index) => (
              <input
                key={index}
                ref={(el) => { inputRefs.current[index] = el; }}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={1}
                className={`w-12 h-14 md:w-14 md:h-16 text-center text-2xl font-display font-bold rounded-xl bg-[rgba(255,255,255,0.03)] border transition-all duration-300 outline-none
                  ${digit ? 'border-purple-primary text-white shadow-[0_0_15px_rgba(124,58,237,0.3)]' : 'border-[rgba(255,255,255,0.1)] text-text-tertiary focus:border-purple-light focus:bg-[rgba(124,58,237,0.05)]'}
                `}
                value={digit}
                onChange={(e) => handleDigitChange(index, e.target.value)}
                onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => handleKeyDown(index, e)}
                onPaste={handlePaste}
                autoComplete={index === 0 ? 'one-time-code' : 'off'}
              />
            ))}
          </div>

          <button
            type="submit"
            disabled={isVerifying || otpCode.length < OTP_LENGTH}
            className="w-full group relative h-14 bg-purple-primary text-white text-[15px] font-semibold rounded-2xl flex items-center justify-center overflow-hidden transition-all hover:bg-purple-light hover:shadow-[0_0_30px_rgba(124,58,237,0.4)] active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none mb-4"
          >
            {isVerifying ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                Verifying...
              </span>
            ) : (
              'Verify OTP'
            )}
          </button>

          <button
            type="button"
            onClick={handleResend}
            disabled={resendCooldown > 0 || isResending}
            className="text-[14px] text-text-tertiary hover:text-white transition-colors disabled:opacity-50 disabled:hover:text-text-tertiary"
          >
            {isResending ? 'Sending...' : (
              resendCooldown > 0 ? `Resend OTP in ${resendCooldown}s` : 'Resend OTP'
            )}
          </button>

        </form>
        
        {/* Footer */}
        <p className="mt-8 text-[14px] text-text-tertiary">
          Wrong email? <Link to="/signup" className="text-purple-light hover:text-white transition-colors font-medium">Go back</Link>
        </p>

      </motion.div>
    </section>
  );
}
