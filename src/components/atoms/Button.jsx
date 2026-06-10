import React from 'react';

const Button = ({ children, onClick, variant = 'primary', className = '', ...props }) => {
  const baseStyles = 'px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2';
  const variants = {
    primary: 'btn-primary hover:bg-blue-700 text-[var(--text-primary)] shadow-lg shadow-blue-900/20',
    secondary: 'bg-[var(--surface-glass)] hover:bg-slate-700 text-[var(--text-primary)] border border-[var(--border-soft)]',
    danger: 'bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-[var(--text-primary)] border border-red-500/20',
    ghost: 'hover:bg-[var(--surface-glass)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${className}`}
      onClick={onClick}
      {...props}
    >
      {children}
    </button>
  );
};

export default Button;
