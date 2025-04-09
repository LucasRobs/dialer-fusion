
import React from 'react';
import { Link } from 'react-router-dom';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  withText?: boolean;
}

const Logo = ({ size = 'md', withText = true }: LogoProps) => {
  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-12 w-12',
  };

  return (
    <Link to="/" className="flex items-center">
      <div className="relative group">
        <img 
          src="/lovable-uploads/00876ca8-effe-463a-8b18-4fe1bf0078d2.png" 
          alt="Collowop Logo" 
          className={`${sizeClasses[size]} rounded-xl transition-all duration-300 hover:shadow-lg hover:shadow-secondary/20`}
        />
      </div>
      {withText && (
        <span className="ml-2 font-bold text-primary text-xl tracking-tight">
          Collowop
        </span>
      )}
    </Link>
  );
};

export default Logo;
