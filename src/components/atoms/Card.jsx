import React from 'react';

const Card = ({ children, title, subtitle, className = '', ...props }) => {
  return (
    <div 
      className={`glass-panel p-6 ${className}`}
      {...props}
    >
      {(title || subtitle) && (
        <div className="mb-6">
          {title && <h3 className="text-xl font-semibold text-[var(--text-primary)] tracking-tight">{title}</h3>}
          {subtitle && <p className="text-[var(--text-muted)] text-sm mt-1">{subtitle}</p>}
        </div>
      )}
      {children}
    </div>
  );
};

export default Card;
