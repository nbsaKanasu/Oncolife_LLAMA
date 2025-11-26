import React from 'react';
import { ActionCard } from '../types';
import { AlertTriangle, Phone, Clock } from 'lucide-react';

const TriageCard: React.FC<{ card: ActionCard }> = ({ card }) => {
  const colors = card.level === 'RED' ? 'bg-red-50 border-red-200 text-red-800' : 'bg-yellow-50 border-yellow-200 text-yellow-800';
  return (
    <div className={`w-full mt-4 rounded-2xl border-2 p-5 ${colors}`}>
      <div className="flex items-center gap-2 mb-4 font-bold text-lg"><AlertTriangle /> {card.title}</div>
      <div className="space-y-2">
        <p><strong>Action:</strong> {card.action}</p>
        <p><strong>Timing:</strong> {card.timing}</p>
        <p className="italic">"{card.script}"</p>
      </div>
    </div>
  );
};
export default TriageCard;