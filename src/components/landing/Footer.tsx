import { Link } from 'react-router-dom';

export default function Footer() {
  const footerLinks = {
    Product: ['Features', 'Pricing', 'Integrations', 'Changelog'],
    Company: ['About', 'Careers', 'Blog', 'Contact'],
    Resources: ['Documentation', 'Help Center', 'API Reference', 'Status'],
    Legal: ['Privacy', 'Terms', 'Security']
  };

  return (
    <footer className="w-full border-t border-[rgba(255,255,255,0.08)] pt-16 pb-10 bg-base">
      <div className="max-w-[1200px] mx-auto px-6 md:px-12 lg:px-20">
        
        {/* Main Grid */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-x-8 gap-y-12 mb-16">
          
          {/* Logo Column */}
          <div className="col-span-2 flex flex-col gap-4">
            <Link to="/" className="flex items-baseline font-display font-bold text-[22px] text-text-primary">
              Kaam Done<span className="w-1 h-1 rounded-full bg-purple-primary ml-[2px]"></span>
            </Link>
            <p className="text-[14px] text-text-tertiary max-w-[240px]">
              The virtual office operating system.
            </p>
            <div className="flex gap-4 mt-2">
              <a href="#" className="text-text-tertiary hover:text-text-primary text-[14px] transition-colors">Twitter</a>
              <a href="#" className="text-text-tertiary hover:text-text-primary text-[14px] transition-colors">LinkedIn</a>
              <a href="#" className="text-text-tertiary hover:text-text-primary text-[14px] transition-colors">GitHub</a>
            </div>
          </div>

          {/* Link Columns */}
          {Object.entries(footerLinks).map(([title, links]) => (
            <div key={title} className="col-span-1 flex flex-col gap-4">
              <h4 className="text-[14px] font-semibold text-text-primary mb-1">{title}</h4>
              <ul className="flex flex-col gap-3">
                {links.map(link => (
                  <li key={link}>
                    <a href="#" className="text-[14px] font-normal text-text-tertiary hover:text-text-primary transition-colors">
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom Bar */}
        <div className="flex flex-col md:flex-row justify-between items-center pt-6 border-t border-[rgba(255,255,255,0.08)] gap-4">
          <p className="text-[13px] text-text-tertiary">
            © 2026 Kaam Done. All rights reserved.
          </p>
          <p className="text-[13px] text-text-tertiary">
            Made with precision.
          </p>
        </div>
      </div>
    </footer>
  );
}
