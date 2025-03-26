
import React from 'react';
import { Phone } from 'lucide-react';
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
      <div className="relative group">
        <div className={`${sizeClasses[size]} aspect-square rounded-xl flex items-center justify-center bg-gradient-to-br from-secondary to-secondary/80 text-white transition-all duration-300 hover:shadow-lg hover:shadow-secondary/20`}>
          <Phone className="h-1/2 w-1/2" strokeWidth={2.5} />
        </div>
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
