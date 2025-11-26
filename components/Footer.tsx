import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="w-full bg-white border-t border-slate-100 py-4 mt-auto">
      <div className="container mx-auto px-4 text-center">
        <p className="text-xs text-slate-400 font-medium tracking-wide">
          POWERED BY <span className="text-teal-600 font-bold">KANASULABS</span>
        </p>
        <p className="text-[10px] text-slate-300 mt-1">
          For educational and triage support only. Call 911 for emergencies.
        </p>
      </div>
    </footer>
  );
};

export default Footer;