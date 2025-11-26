import React from 'react';
import { HeartPulse } from 'lucide-react';
import { APP_NAME, TAGLINE } from '../constants';

const Header: React.FC = () => {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-teal-600 rounded-lg flex items-center justify-center text-white">
            <HeartPulse size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">{APP_NAME}</h1>
            <p className="text-xs text-teal-600 font-medium">{TAGLINE}</p>
          </div>
        </div>
      </div>
    </header>
  );
};
export default Header;