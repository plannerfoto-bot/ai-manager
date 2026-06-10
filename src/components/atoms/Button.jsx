import React from 'react';

const Button = ({ children, onClick, variant = 'primary', className = '', ...props }) => {
  const baseStyles = 'px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2';
  const variants = {
    primary: 'btn-primary hover:bg-blue-700 text-[#EDEDEF] shadow-lg shadow-blue-900/20',
    secondary: 'bg-white/5 hover:bg-slate-700 text-[#EDEDEF] border border-white/10',
    danger: 'bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-[#EDEDEF] border border-red-500/20',
    ghost: 'hover:bg-white/5 text-[#8A8F98] hover:text-[#EDEDEF]'
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
