import React from 'react';

const Input = ({ label, icon: Icon, className = '', ...props }) => {
  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {label && <label className="text-sm font-medium text-[#8A8F98]">{label}</label>}
      <div className="relative group">
        {Icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8A8F98] group-focus-within:text-indigo-400 transition-all">
            <Icon size={18} />
          </div>
        )}
        <input 
          className={`w-full bg-white/5/50 border border-white/10 rounded-lg py-2.5 ${Icon ? 'pl-10' : 'px-4'} pr-4 text-[#EDEDEF] placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-indigo-500 transition-all`}
          {...props}
        />
      </div>
    </div>
  );
};

export default Input;
