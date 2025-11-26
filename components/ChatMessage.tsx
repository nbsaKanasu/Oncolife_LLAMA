import React from 'react';
import { Message } from '../types';
import { User, Activity, AlertCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface ChatMessageProps {
  message: Message;
  onOptionSelect?: (option: string) => void;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message, onOptionSelect }) => {
  const isUser = message.role === 'user';

  return (
    <div className={`flex w-full mb-6 ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`flex max-w-[90%] md:max-w-[80%] ${isUser ? 'flex-row-reverse' : 'flex-row'} items-start gap-3`}>
        
        {/* Avatar */}
        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
          isUser ? 'bg-indigo-100 text-indigo-600' : 'bg-teal-100 text-teal-600'
        }`}>
          {isUser ? <User size={18} /> : <Activity size={18} />}
        </div>

        {/* Message Content Area */}
        <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} w-full`}>
          
          {/* Bubble */}
          <div className={`px-5 py-3.5 rounded-2xl shadow-sm text-sm leading-relaxed ${
            isUser 
              ? 'bg-indigo-600 text-white rounded-tr-none' 
              : 'bg-white text-slate-700 border border-slate-200 rounded-tl-none'
          }`}>
            {message.isError ? (
               <div className="flex items-center gap-2 text-red-100">
                 <AlertCircle size={16} />
                 <span>{message.text}</span>
               </div>
            ) : (
              <div className="markdown-content">
                  {isUser ? (
                      message.text
                  ) : (
                      <ReactMarkdown 
                        components={{
                            strong: ({node, ...props}) => <span className="font-bold text-teal-800" {...props} />,
                            h3: ({node, ...props}) => <h3 className="font-bold text-lg text-slate-800 mt-3 mb-2" {...props} />,
                            ul: ({node, ...props}) => <ul className="list-disc ml-4 my-2" {...props} />,
                            li: ({node, ...props}) => <li className="mb-1" {...props} />,
                            p: ({node, ...props}) => <p className="mb-2 last:mb-0" {...props} />
                        }}
                      >
                        {message.text}
                      </ReactMarkdown>
                  )}
              </div>
            )}
          </div>

          {/* Metadata */}
          <span className="text-[10px] text-slate-400 mt-1 px-1">
            {isUser ? 'You' : 'OncoLife Assistant'}
          </span>

          {/* Interactive Options (Only for Bot) */}
          {!isUser && message.options && message.options.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {message.options.map((option, idx) => (
                <button
                  key={idx}
                  onClick={() => onOptionSelect && onOptionSelect(option)}
                  className="px-4 py-2 bg-white border border-teal-200 text-teal-700 text-sm font-medium rounded-xl hover:bg-teal-50 hover:border-teal-300 transition-all shadow-sm active:scale-95"
                >
                  {option}
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