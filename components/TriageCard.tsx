
import React from 'react';
import { ActionCard } from '../types';
import { AlertTriangle, Phone, Clock, MessageSquare } from 'lucide-react';

interface TriageCardProps {
  card: ActionCard;
}

const TriageCard: React.FC<TriageCardProps> = ({ card }) => {
  const getTheme = (level: string) => {
    switch (level) {
      case 'RED': return { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-800', icon: 'text-red-600', button: 'bg-red-600 hover:bg-red-700' };
      case 'AMBER': return { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-800', icon: 'text-orange-600', button: 'bg-orange-600 hover:bg-orange-700' };
      case 'YELLOW': return { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-800', icon: 'text-yellow-600', button: 'bg-yellow-600 hover:bg-yellow-700' };
      case 'GREEN': return { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-800', icon: 'text-green-600', button: 'bg-green-600 hover:bg-green-700' };
      default: return { bg: 'bg-slate-50', border: 'border-slate-200', text: 'text-slate-800', icon: 'text-slate-600', button: 'bg-slate-600' };
    }
  };

  const theme = getTheme(card.level);

  return (
    <div className={`w-full mt-4 rounded-2xl border-2 ${theme.border} ${theme.bg} overflow-hidden shadow-sm`}>
      <div className={`p-4 border-b ${theme.border} flex items-center gap-3`}>
        <AlertTriangle className={theme.icon} size={24} />
        <h3 className={`text-lg font-bold ${theme.text} uppercase tracking-wide`}>{card.title}</h3>
      </div>
      
      <div className="p-5 space-y-4">
        {/* Action Section */}
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg bg-white ${theme.icon}`}>
             <Phone size={20} />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Action</span>
            <p className={`text-lg font-bold ${theme.text}`}>{card.action}</p>
          </div>
        </div>

        {/* Timing Section */}
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg bg-white ${theme.icon}`}>
             <Clock size={20} />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Timing</span>
            <p className="text-slate-700 font-medium">{card.timing}</p>
          </div>
        </div>

        {/* Script Section */}
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg bg-white ${theme.icon}`}>
             <MessageSquare size={20} />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">What to say</span>
            <p className="text-slate-700 italic">"{card.script}"</p>
          </div>
        </div>
      </div>

      {/* Call Button for High Risks */}
      {(card.level === 'RED' || card.level === 'AMBER') && (
        <div className="p-4 bg-white border-t border-slate-100">
            <a 
              href={card.level === 'RED' ? "tel:911" : "tel:#"} 
              className={`flex items-center justify-center gap-2 w-full py-3 rounded-xl text-white font-bold shadow-sm transition-all ${theme.button}`}
            >
              <Phone size={18} />
              {card.level === 'RED' ? 'CALL 911 / CARE TEAM' : 'CALL CARE TEAM'}
            </a>
        </div>
      )}
    </div>
  );
};

export default TriageCard;
