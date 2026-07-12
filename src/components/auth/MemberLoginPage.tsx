import { useState, type MouseEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, useMotionValue, useMotionTemplate } from 'framer-motion';
import { ArrowRight, User, Lock, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { memberLogin } from '../../api/auth';
import '../../styles/globals.css';

const MemberLoginPage: React.FC = () => {
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Spotlight Effect State
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  function handleMouseMove({ currentTarget, clientX, clientY }: MouseEvent) {
    const { left, top } = currentTarget.getBoundingClientRect();
    mouseX.set(clientX - left);
    mouseY.set(clientY - top);
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!username.trim() || !password.trim()) {
      setError('Please enter both username and password.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await memberLogin({ username: username.trim(), password });
      
      if (response.success && response.data) {
        const { accessToken } = response.data as { accessToken: string };
        sessionStorage.setItem('accessToken', accessToken);
        sessionStorage.setItem('isTeamMember', 'true');
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid username or password.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020204] flex flex-col items-center justify-center relative overflow-hidden px-6">
      
      {/* Background Ambient Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vw] md:w-[600px] h-[600px] bg-purple-primary/15 rounded-full blur-[150px] pointer-events-none"></div>

      {/* Top Left Logo */}
      <Link to="/" className="absolute top-8 left-8 flex items-center gap-2 group z-50">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-primary to-purple-light flex items-center justify-center shadow-[0_0_20px_rgba(124,58,237,0.4)] group-hover:shadow-[0_0_30px_rgba(124,58,237,0.6)] transition-shadow">
          <span className="text-white font-display font-bold text-sm tracking-wider">O</span>
        </div>
        <span className="font-display font-bold text-white text-xl tracking-[0.15em] uppercase">Kaam Done</span>
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
            <h1 className="font-display font-bold text-[32px] text-white tracking-tight mb-2">Team Access</h1>
            <p className="text-[15px] text-text-secondary">Sign in to your team's workspace</p>
          </div>

          {error && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mb-6 p-4 rounded-xl bg-[#FF5F56]/10 border border-[#FF5F56]/20 flex items-start gap-3"
            >
              <AlertCircle size={18} className="text-[#FF5F56] shrink-0 mt-0.5" />
              <p className="text-[14px] text-[#FF5F56]">{error}</p>
            </motion.div>
          )}

          <form onSubmit={handleLogin} className="flex flex-col gap-5">
            {/* Username Field */}
            <div className="flex flex-col gap-2">
              <label className="text-[13px] font-medium text-text-secondary uppercase tracking-wider ml-1">
                Username
              </label>
              <div className="relative group/input">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-text-tertiary group-focus-within/input:text-purple-light transition-colors">
                  <User size={18} />
                </div>
                <input
                  type="text"
                  placeholder="e.g. john_doe"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    if (error) setError(null);
                  }}
                  disabled={isLoading}
                  required
                  className="w-full h-14 bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-xl pl-12 pr-4 text-white placeholder-text-tertiary outline-none transition-all duration-300 focus:bg-[rgba(124,58,237,0.05)] focus:border-purple-primary focus:shadow-[0_0_20px_rgba(124,58,237,0.15)] disabled:opacity-50"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="flex flex-col gap-2">
              <label className="text-[13px] font-medium text-text-secondary uppercase tracking-wider ml-1">
                Password
              </label>
              <div className="relative group/input">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-text-tertiary group-focus-within/input:text-purple-light transition-colors">
                  <Lock size={18} />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError(null);
                  }}
                  disabled={isLoading}
                  required
                  className="w-full h-14 bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-xl pl-12 pr-12 text-white placeholder-text-tertiary outline-none transition-all duration-300 focus:bg-[rgba(124,58,237,0.05)] focus:border-purple-primary focus:shadow-[0_0_20px_rgba(124,58,237,0.15)] disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="group/btn relative w-full h-14 mt-4 bg-white text-black rounded-xl flex items-center justify-center font-bold text-[16px] transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 disabled:hover:scale-100 overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-white via-purple-100 to-white opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300"></div>
              
              <span className="relative z-10 flex items-center gap-2">
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin"></div>
                ) : (
                  <>
                    Sign In as Member <ArrowRight size={18} className="transition-transform group-hover/btn:translate-x-1" />
                  </>
                )}
              </span>
            </button>
          </form>

          <div className="mt-8 text-center border-t border-[rgba(255,255,255,0.08)] pt-8">
            <p className="text-[14px] text-text-secondary">
              Are you an Admin?{' '}
              <Link to="/login" className="text-white font-medium hover:text-purple-light transition-colors underline decoration-[rgba(255,255,255,0.3)] underline-offset-4 hover:decoration-purple-light">
                Admin Login
              </Link>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default MemberLoginPage;
