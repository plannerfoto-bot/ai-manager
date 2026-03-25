import React from 'react';

const Card = ({ children, title, subtitle, className = '', ...props }) => {
  return (
    <div 
      className={`bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-6 shadow-2xl ${className}`}
      {...props}
    >
      {(title || subtitle) && (
        <div className="mb-6">
          {title && <h3 className="text-xl font-semibold text-white tracking-tight">{title}</h3>}
          {subtitle && <p className="text-slate-400 text-sm mt-1">{subtitle}</p>}
        </div>
      )}
      {children}
    </div>
  );
};

export default Card;
