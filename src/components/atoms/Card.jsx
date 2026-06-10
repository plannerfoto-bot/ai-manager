import React from 'react';

const Card = ({ children, title, subtitle, className = '', ...props }) => {
  return (
    <div 
      className={`bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-[0_8px_32px_rgba(0,0,0,0.3)] ${className}`}
      {...props}
    >
      {(title || subtitle) && (
        <div className="mb-6">
          {title && <h3 className="text-xl font-semibold text-[#EDEDEF] tracking-tight">{title}</h3>}
          {subtitle && <p className="text-[#8A8F98] text-sm mt-1">{subtitle}</p>}
        </div>
      )}
      {children}
    </div>
  );
};

export default Card;
