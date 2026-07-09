import { useState, type MouseEvent, type FormEvent, type ChangeEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, useMotionValue, useMotionTemplate } from 'framer-motion';
import { Eye, EyeOff, Mail, Lock, ArrowRight, AlertCircle } from 'lucide-react';
import { loginUser } from '../../api/auth';
import '../../styles/globals.css';

// ---- Form State ----
interface FormData {
  email: string;
  password: string;
}

interface FormErrors {
  email?: string;
  password?: string;
}

// ---- Client-side Validation ----
function validateForm(data: FormData): FormErrors {
  const errors: FormErrors = {};
  if (!data.email.trim()) errors.email = 'Email address is required.';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) errors.email = 'Enter a valid email address.';
  if (!data.password) errors.password = 'Password is required.';
  return errors;
}

export default function LoginPage() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState<FormData>({ email: '', password: '' });
  const [errors, setErrors] = useState<FormErrors>({});
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [globalError, setGlobalError] = useState('');

  // Spotlight Effect State
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  function handleMouseMove({ currentTarget, clientX, clientY }: MouseEvent) {
    const { left, top } = currentTarget.getBoundingClientRect();
    mouseX.set(clientX - left);
    mouseY.set(clientY - top);
  }

  // ---- Input Handler ----
  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
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
      const response = await loginUser({
        email: formData.email.trim(),
        password: formData.password,
      });

      if (response.data?.accessToken) {
        sessionStorage.setItem('accessToken', response.data.accessToken as string);
      }
      if (response.data?.idToken) {
        sessionStorage.setItem('idToken', response.data.idToken as string);
      }

      navigate('/dashboard');
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Login failed. Please try again.';
      if (msg.toLowerCase().includes('verified') || msg.toLowerCase().includes('not confirmed')) {
        navigate(`/verify?email=${encodeURIComponent(formData.email.trim())}`);
      } else {
        setGlobalError(msg);
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#020204] flex flex-col items-center justify-center relative overflow-hidden px-6">
      
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
        className="group relative w-full max-w-[440px] bg-[rgba(10,10,12,0.6)] backdrop-blur-3xl border border-[rgba(255,255,255,0.08)] rounded-[32px] p-8 md:p-10 shadow-[0_40px_80px_rgba(0,0,0,0.6)] overflow-hidden z-10"
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
          <div className="mb-10 text-center">
            <h1 className="font-display font-bold text-[32px] text-white tracking-tight mb-2">Welcome back</h1>
            <p className="text-[15px] text-text-secondary">Sign in to your virtual workspace</p>
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
            {/* Email Field */}
            <div className="flex flex-col gap-2">
              <label htmlFor="login-email" className="text-[13px] font-medium text-text-secondary uppercase tracking-wider ml-1">
                Email Address
              </label>
              <div className="relative group/input">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-text-tertiary group-focus-within/input:text-purple-light transition-colors">
                  <Mail size={18} />
                </div>
                <input
                  id="login-email"
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
              <div className="flex items-center justify-between ml-1">
                <label htmlFor="login-password" className="text-[13px] font-medium text-text-secondary uppercase tracking-wider">
                  Password
                </label>
                <Link to="/forgot-password" className="text-[13px] font-medium text-purple-light hover:text-white transition-colors">
                  Forgot?
                </Link>
              </div>
              <div className="relative group/input">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-text-tertiary group-focus-within/input:text-purple-light transition-colors">
                  <Lock size={18} />
                </div>
                <input
                  id="login-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
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
              {errors.password && (
                <span className="text-[12px] text-[#FF5F56] ml-1">{errors.password}</span>
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
                    Sign In <ArrowRight size={18} className="transition-transform group-hover/btn:translate-x-1" />
                  </>
                )}
              </span>
            </button>
          </form>

          <div className="mt-8 text-center border-t border-[rgba(255,255,255,0.08)] pt-8">
            <p className="text-[14px] text-text-secondary">
              Don't have an account?{' '}
              <Link to="/signup" className="text-white font-medium hover:text-purple-light transition-colors underline decoration-[rgba(255,255,255,0.3)] underline-offset-4 hover:decoration-purple-light">
                Create one free
              </Link>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
