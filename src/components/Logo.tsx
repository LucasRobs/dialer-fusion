
import React from 'react';
import { Link } from 'react-router-dom';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  withText?: boolean;
}

const Logo = ({ size = 'md', withText = true }: LogoProps) => {
  const sizeClasses = {
    sm: 'h-8',
    md: 'h-10',
    lg: 'h-12',
  };

  return (
    <Link to="/" className="flex items-center">
      <div className="relative">
        <img 
          src="/lovable-uploads/1782f7a5-bdca-4e2d-bc30-444b2b443305.png" 
          alt="Collowop Logo" 
          className={`${sizeClasses[size]} aspect-square transition-all duration-300`} 
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
