import React from 'react';
import { HeartPulse } from 'lucide-react';
import { APP_NAME, TAGLINE } from '../constants';

const Header: React.FC = () => {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-teal-600 rounded-lg flex items-center justify-center text-white shadow-teal-200 shadow-lg">
            <HeartPulse size={24} strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800 tracking-tight leading-none">
              {APP_NAME}
            </h1>
            <p className="text-xs text-teal-600 font-medium tracking-wide mt-0.5">
              {TAGLINE}
            </p>
          </div>
        </div>
        <div className="hidden md:block">
           <div className="px-3 py-1 bg-red-50 text-red-600 text-xs font-bold rounded-full border border-red-100 animate-pulse">
             EMERGENCY? CALL 911
           </div>
        </div>
      </div>
    </header>
  );
};

export default Header;