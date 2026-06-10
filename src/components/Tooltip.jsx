import React, { useState } from 'react';
import { HelpCircle } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

const Tooltip = ({ text, children }) => {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div 
      className="relative flex items-center"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}
      <div className="ml-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-help transition-colors">
        <HelpCircle size={14} />
      </div>

      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-[var(--surface-card)] border border-[var(--border-soft)] rounded-xl shadow-2xl shadow-black/50 pointer-events-none"
          >
            <div className="text-[13px] text-[var(--text-secondary)] leading-relaxed font-normal normal-case tracking-normal">
              {text}
            </div>
            {/* Seta do balao */}
            <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-[1px] w-3 h-3 bg-[var(--surface-card)] border-b border-r border-[var(--border-soft)] rotate-45"></div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Tooltip;
