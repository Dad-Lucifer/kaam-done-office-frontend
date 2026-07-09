import { useState, useEffect } from 'react';
import { Menu, X } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { name: 'Features', href: '#features' },
    { name: 'Solutions', href: '#solution' },
    { name: 'Pricing', href: '#pricing' },
    { name: 'FAQ', href: '#faq' },
  ];

  return (
    <header 
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? 'backdrop-blur-[20px] bg-[#070709]/80 border-b border-[rgba(255,255,255,0.08)]' : 'bg-transparent border-b border-transparent'
      }`}
    >
      <div className="max-w-[1200px] mx-auto w-full px-6 md:px-12 lg:px-20 h-16 md:h-[72px] flex items-center justify-between">
        
        {/* Logo */}
        <Link to="/" className="flex items-baseline font-display font-bold text-[22px] text-text-primary">
          KAAM DONE<span className="w-1 h-1 rounded-full bg-purple-primary ml-[2px]"></span>
        </Link>

        {/* Desktop Links */}
        <nav className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <a 
              key={link.name} 
              href={link.href}
              className="text-[14px] font-medium text-text-secondary hover:text-text-primary transition-colors duration-150 tracking-[0.01em]"
            >
              {link.name}
            </a>
          ))}
        </nav>

        {/* Desktop CTAs */}
        <div className="hidden md:flex items-center gap-6">
          <Link 
            to="/member-login" 
            className="text-[14px] font-medium text-text-secondary hover:text-text-primary border-b border-transparent hover:border-text-primary transition-all duration-150"
          >
            Team Login
          </Link>
          <Link 
            to="/login" 
            className="text-[14px] font-medium text-text-secondary hover:text-text-primary border-b border-transparent hover:border-text-primary transition-all duration-150"
          >
            Sign In
          </Link>
          <Link 
            to="/signup"
            className="h-9 px-5 bg-purple-primary text-white text-[14px] font-semibold rounded-full flex items-center justify-center hover:bg-purple-light hover:shadow-[0_0_15px_rgba(124,58,237,0.3)] transition-all duration-150 tracking-[0.01em]"
          >
            Get Started
          </Link>
        </div>

        {/* Mobile Menu Toggle */}
        <button 
          className="md:hidden text-text-secondary hover:text-text-primary"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 top-16 bg-elevated z-40 flex flex-col p-6 md:hidden">
          <nav className="flex flex-col gap-12 mt-8">
            {navLinks.map((link) => (
              <a 
                key={link.name} 
                href={link.href}
                className="text-[18px] font-medium text-text-primary tracking-[0.01em]"
                onClick={() => setMobileMenuOpen(false)}
              >
                {link.name}
              </a>
            ))}
            <div className="flex flex-col gap-6 mt-4 border-t border-[rgba(255,255,255,0.08)] pt-8">
              <Link 
                to="/member-login" 
                className="text-[16px] font-medium text-text-secondary"
                onClick={() => setMobileMenuOpen(false)}
              >
                Team Login
              </Link>
              <Link 
                to="/login" 
                className="text-[16px] font-medium text-text-secondary"
                onClick={() => setMobileMenuOpen(false)}
              >
                Sign In
              </Link>
              <Link 
                to="/signup"
                className="h-12 w-full bg-purple-primary text-white text-[16px] font-semibold rounded-xl flex items-center justify-center"
                onClick={() => setMobileMenuOpen(false)}
              >
                Get Started
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
