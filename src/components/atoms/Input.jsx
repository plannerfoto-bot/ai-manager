import React from 'react';

const Input = ({ label, icon: Icon, className = '', ...props }) => {
  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {label && <label className="text-sm font-medium text-[var(--text-muted)]">{label}</label>}
      <div className="relative group">
        {Icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] group-focus-within:text-[var(--accent)] transition-all">
            <Icon size={18} />
          </div>
        )}
        <input 
          className={`w-full bg-[var(--surface-glass)]/50 border border-[var(--border-soft)] rounded-lg py-2.5 ${Icon ? 'pl-10' : 'px-4'} pr-4 text-[var(--text-primary)] placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-indigo-500 transition-all`}
          {...props}
        />
      </div>
    </div>
  );
};

export default Input;
