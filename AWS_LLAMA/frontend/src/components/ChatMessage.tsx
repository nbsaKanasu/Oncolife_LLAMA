import React from 'react';
import { Message } from '../types';
import { User, Activity } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface ChatMessageProps { message: Message; onOptionSelect?: (option: string) => void; }

const ChatMessage: React.FC<ChatMessageProps> = ({ message, onOptionSelect }) => {
  const isUser = message.role === 'user';
  return (
    <div className={`flex w-full mb-6 ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`flex max-w-[90%] md:max-w-[80%] ${isUser ? 'flex-row-reverse' : 'flex-row'} items-start gap-3`}>
        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${isUser ? 'bg-indigo-100' : 'bg-teal-100'}`}>
          {isUser ? <User size={18} /> : <Activity size={18} />}
        </div>
        <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} w-full`}>
          <div className={`px-5 py-3.5 rounded-2xl shadow-sm text-sm ${isUser ? 'bg-indigo-600 text-white' : 'bg-white text-slate-700 border'}`}>
             {isUser ? message.text : <ReactMarkdown>{message.text}</ReactMarkdown>}
          </div>
          {!isUser && message.options && (
            <div className="mt-3 flex flex-wrap gap-2">
              {message.options.map((opt, i) => (
                <button key={i} onClick={() => onOptionSelect && onOptionSelect(opt)} className="px-4 py-2 bg-white border border-teal-200 text-teal-700 text-sm rounded-xl hover:bg-teal-50">
                  {opt}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
export default ChatMessage;