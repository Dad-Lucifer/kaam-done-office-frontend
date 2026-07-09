import { useState, type MouseEvent, type FormEvent, type ChangeEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, useMotionValue, useMotionTemplate } from 'framer-motion';
import { Eye, EyeOff, Mail, Lock, User, ArrowRight, AlertCircle, Check } from 'lucide-react';
import { signupUser } from '../../api/auth';
import '../../styles/globals.css';

// ---- Form State ----
interface FormData {
  name: string;
  email: string;
  password: string;
  agreeTerms: boolean;
}

interface FormErrors {
  name?: string;
  email?: string;
  password?: string;
  agreeTerms?: string;
}

// ---- Password Strength ----
function getPasswordStrength(password: string): { score: number; label: string; color: string } {
  if (!password) return { score: 0, label: '', color: 'transparent' };
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  const map: Record<number, { label: string; color: string }> = {
    1: { label: 'Very Weak', color: '#EF4444' },
    2: { label: 'Weak',      color: '#F97316' },
    3: { label: 'Fair',      color: '#F59E0B' },
    4: { label: 'Strong',    color: '#10B981' },
    5: { label: 'Very Strong', color: '#06B6D4' },
  };
  return { score, ...(map[score] || { label: '', color: 'transparent' }) };
}

// ---- Client-side Validation ----
function validateForm(data: FormData): FormErrors {
  const errors: FormErrors = {};
  if (!data.name.trim()) errors.name = 'Full name is required.';
  else if (data.name.trim().length < 2) errors.name = 'Name must be at least 2 characters.';

  if (!data.email.trim()) errors.email = 'Email address is required.';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) errors.email = 'Enter a valid email address.';

  if (!data.password) errors.password = 'Password is required.';
  else if (data.password.length < 8) errors.password = 'Password must be at least 8 characters.';
  else if (!/[A-Z]/.test(data.password)) errors.password = 'Include at least one uppercase letter.';
  else if (!/[a-z]/.test(data.password)) errors.password = 'Include at least one lowercase letter.';
  else if (!/[0-9]/.test(data.password)) errors.password = 'Include at least one number.';
  else if (!/[^A-Za-z0-9]/.test(data.password)) errors.password = 'Include at least one special character.';

  if (!data.agreeTerms) errors.agreeTerms = 'You must accept the Terms & Conditions.';
  return errors;
}

export default function SignupPage() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    password: '',
    agreeTerms: false,
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [globalError, setGlobalError] = useState('');

  const strength = getPasswordStrength(formData.password);

  // Spotlight Effect State
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  function handleMouseMove({ currentTarget, clientX, clientY }: MouseEvent) {
    const { left, top } = currentTarget.getBoundingClientRect();
    mouseX.set(clientX - left);
    mouseY.set(clientY - top);
  }

  // ---- Input Handlers ----
  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    if (errors[name as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
    if (globalError) setGlobalError('');
  }

  // ---- Submit ----
  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const validationErrors = validateForm(formData);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsLoading(true);
    setGlobalError('');

    try {
      await signupUser({
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
      });

      navigate(`/verify?email=${encodeURIComponent(formData.email.trim().toLowerCase())}`);
    } catch (error) {
      setGlobalError(error instanceof Error ? error.message : 'Sign up failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#020204] flex flex-col items-center justify-center relative overflow-hidden px-6 py-12">
      
      {/* Background Ambient Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vw] md:w-[600px] h-[600px] bg-purple-primary/15 rounded-full blur-[150px] pointer-events-none"></div>

      {/* Top Left Logo */}
      <Link to="/" className="absolute top-8 left-8 flex items-center gap-2 group z-50">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-primary to-purple-light flex items-center justify-center shadow-[0_0_20px_rgba(124,58,237,0.4)] group-hover:shadow-[0_0_30px_rgba(124,58,237,0.6)] transition-shadow">
          <span className="text-white font-display font-bold text-sm tracking-wider">O</span>
        </div>
        <span className="font-display font-bold text-white text-xl tracking-[0.15em] uppercase">Operiq</span>
      </Link>

      <motion.div 
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        onMouseMove={handleMouseMove}
        className="group relative w-full max-w-[460px] bg-[rgba(10,10,12,0.6)] backdrop-blur-3xl border border-[rgba(255,255,255,0.08)] rounded-[32px] p-8 md:p-10 shadow-[0_40px_80px_rgba(0,0,0,0.6)] overflow-hidden z-10"
      >
        {/* Interactive Spotlight Overlay */}
        <motion.div
          className="pointer-events-none absolute -inset-px rounded-[32px] opacity-0 transition duration-500 group-hover:opacity-100"
          style={{
            background: useMotionTemplate`
              radial-gradient(
                400px circle at ${mouseX}px ${mouseY}px,
                rgba(124, 58, 237, 0.15),
                transparent 40%
              )
            `,
          }}
        />

        <div className="relative z-10">
          <div className="mb-8 text-center">
            <h1 className="font-display font-bold text-[32px] text-white tracking-tight mb-2">Create account</h1>
            <p className="text-[15px] text-text-secondary">Start building your virtual office</p>
          </div>

          {globalError && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mb-6 p-4 rounded-xl bg-[#FF5F56]/10 border border-[#FF5F56]/20 flex items-start gap-3"
            >
              <AlertCircle size={18} className="text-[#FF5F56] shrink-0 mt-0.5" />
              <p className="text-[14px] text-[#FF5F56]">{globalError}</p>
            </motion.div>
          )}

          <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
            {/* Full Name Field */}
            <div className="flex flex-col gap-2">
              <label htmlFor="signup-name" className="text-[13px] font-medium text-text-secondary uppercase tracking-wider ml-1">
                Full Name
              </label>
              <div className="relative group/input">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-text-tertiary group-focus-within/input:text-purple-light transition-colors">
                  <User size={18} />
                </div>
                <input
                  id="signup-name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  placeholder="John Doe"
                  value={formData.name}
                  onChange={handleChange}
                  className={`w-full h-14 bg-[rgba(255,255,255,0.03)] border rounded-xl pl-12 pr-4 text-white placeholder-text-tertiary outline-none transition-all duration-300 focus:bg-[rgba(124,58,237,0.05)] focus:border-purple-primary focus:shadow-[0_0_20px_rgba(124,58,237,0.15)] ${
                    errors.name ? 'border-[#FF5F56] bg-[#FF5F56]/5' : 'border-[rgba(255,255,255,0.08)]'
                  }`}
                />
              </div>
              {errors.name && (
                <span className="text-[12px] text-[#FF5F56] ml-1">{errors.name}</span>
              )}
            </div>

            {/* Email Field */}
            <div className="flex flex-col gap-2">
              <label htmlFor="signup-email" className="text-[13px] font-medium text-text-secondary uppercase tracking-wider ml-1">
                Email Address
              </label>
              <div className="relative group/input">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-text-tertiary group-focus-within/input:text-purple-light transition-colors">
                  <Mail size={18} />
                </div>
                <input
                  id="signup-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@company.com"
                  value={formData.email}
                  onChange={handleChange}
                  className={`w-full h-14 bg-[rgba(255,255,255,0.03)] border rounded-xl pl-12 pr-4 text-white placeholder-text-tertiary outline-none transition-all duration-300 focus:bg-[rgba(124,58,237,0.05)] focus:border-purple-primary focus:shadow-[0_0_20px_rgba(124,58,237,0.15)] ${
                    errors.email ? 'border-[#FF5F56] bg-[#FF5F56]/5' : 'border-[rgba(255,255,255,0.08)]'
                  }`}
                />
              </div>
              {errors.email && (
                <span className="text-[12px] text-[#FF5F56] ml-1">{errors.email}</span>
              )}
            </div>

            {/* Password Field */}
            <div className="flex flex-col gap-2">
              <label htmlFor="signup-password" className="text-[13px] font-medium text-text-secondary uppercase tracking-wider ml-1">
                Password
              </label>
              <div className="relative group/input">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-text-tertiary group-focus-within/input:text-purple-light transition-colors">
                  <Lock size={18} />
                </div>
                <input
                  id="signup-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="Min. 8 characters"
                  value={formData.password}
                  onChange={handleChange}
                  className={`w-full h-14 bg-[rgba(255,255,255,0.03)] border rounded-xl pl-12 pr-12 text-white placeholder-text-tertiary outline-none transition-all duration-300 focus:bg-[rgba(124,58,237,0.05)] focus:border-purple-primary focus:shadow-[0_0_20px_rgba(124,58,237,0.15)] ${
                    errors.password ? 'border-[#FF5F56] bg-[#FF5F56]/5' : 'border-[rgba(255,255,255,0.08)]'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              {/* Password Strength Bar */}
              {formData.password && (
                <div className="mt-1 flex flex-col gap-1.5 ml-1">
                  <div className="flex gap-1.5 w-full">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div
                        key={i}
                        className="h-1 flex-1 rounded-full transition-colors duration-300"
                        style={{
                          backgroundColor: i <= strength.score ? strength.color : 'rgba(255,255,255,0.08)'
                        }}
                      />
                    ))}
                  </div>
                  <span className="text-[11px] font-medium uppercase tracking-wider" style={{ color: strength.color }}>
                    {strength.label}
                  </span>
                </div>
              )}

              {errors.password && (
                <span className="text-[12px] text-[#FF5F56] ml-1">{errors.password}</span>
              )}
            </div>

            {/* Terms & Conditions */}
            <div className="mt-2 flex flex-col gap-2">
              <label className="flex items-start gap-3 cursor-pointer group/terms">
                <div className="relative flex items-center justify-center shrink-0 mt-0.5">
                  <input
                    id="signup-terms"
                    name="agreeTerms"
                    type="checkbox"
                    className="peer sr-only"
                    checked={formData.agreeTerms}
                    onChange={handleChange}
                  />
                  <div className="w-5 h-5 rounded border border-[rgba(255,255,255,0.2)] bg-[rgba(255,255,255,0.03)] peer-checked:bg-purple-primary peer-checked:border-purple-primary transition-colors flex items-center justify-center group-hover/terms:border-purple-light">
                    <Check size={14} strokeWidth={3} className="text-white opacity-0 peer-checked:opacity-100 transition-opacity" />
                  </div>
                </div>
                <span className="text-[13px] text-text-secondary leading-[1.6]">
                  I agree to the{' '}
                  <Link to="/terms" className="text-white hover:text-purple-light underline decoration-[rgba(255,255,255,0.3)] hover:decoration-purple-light transition-colors">Terms of Service</Link>
                  {' '}and{' '}
                  <Link to="/privacy" className="text-white hover:text-purple-light underline decoration-[rgba(255,255,255,0.3)] hover:decoration-purple-light transition-colors">Privacy Policy</Link>
                </span>
              </label>
              {errors.agreeTerms && (
                <span className="text-[12px] text-[#FF5F56] ml-8">{errors.agreeTerms}</span>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="group/btn relative w-full h-14 mt-4 bg-white text-black rounded-xl flex items-center justify-center font-bold text-[16px] transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 disabled:hover:scale-100 overflow-hidden"
            >
              {/* Button inner glow on hover */}
              <div className="absolute inset-0 bg-gradient-to-r from-white via-purple-100 to-white opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300"></div>
              
              <span className="relative z-10 flex items-center gap-2">
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin"></div>
                ) : (
                  <>
                    Create Account <ArrowRight size={18} className="transition-transform group-hover/btn:translate-x-1" />
                  </>
                )}
              </span>
            </button>
          </form>

          <div className="mt-8 text-center border-t border-[rgba(255,255,255,0.08)] pt-8">
            <p className="text-[14px] text-text-secondary">
              Already have an account?{' '}
              <Link to="/login" className="text-white font-medium hover:text-purple-light transition-colors underline decoration-[rgba(255,255,255,0.3)] underline-offset-4 hover:decoration-purple-light">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
