
import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import Logo from './Logo';
import { Button } from '@/components/ui/button';

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();
  const isAuthenticated = location.pathname.includes('/dashboard') || 
                         location.pathname.includes('/clients') || 
                         location.pathname.includes('/training') || 
                         location.pathname.includes('/campaigns') || 
                         location.pathname.includes('/history') || 
                         location.pathname.includes('/analytics');

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <header className="w-full fixed top-0 z-50 glass border-b">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <Logo />
        
        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-6">
          {!isAuthenticated ? (
            <>
              <Link to="/login">
                <Button variant="outline" size="sm" className="mr-2">
                  Log In
                </Button>
              </Link>
              <Link to="/register">
                <Button size="sm">
                  Sign Up
                </Button>
              </Link>
            </>
          ) : (
            <>
              <Link to="/dashboard" className="text-foreground/80 hover:text-foreground transition-colors">
                Dashboard
              </Link>
              <Link to="/clients" className="text-foreground/80 hover:text-foreground transition-colors">
                Clients
              </Link>
              <Link to="/training" className="text-foreground/80 hover:text-foreground transition-colors">
                AI Training
              </Link>
              <Link to="/campaigns" className="text-foreground/80 hover:text-foreground transition-colors">
                Campaigns
              </Link>
              <Link to="/history" className="text-foreground/80 hover:text-foreground transition-colors">
                History
              </Link>
              <Link to="/analytics" className="text-foreground/80 hover:text-foreground transition-colors">
                Analytics
              </Link>
              <Button variant="outline" size="sm" onClick={() => console.log('Logout')}>
                Logout
              </Button>
            </>
          )}
        </nav>
        
        {/* Mobile Menu Button */}
        <button 
          className="md:hidden text-foreground"
          onClick={toggleMenu}
          aria-label="Toggle menu"
        >
          {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>
      
      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden absolute top-[72px] left-0 w-full bg-background border-b z-40 animate-fade-in">
          <div className="container mx-auto px-4 py-4 flex flex-col space-y-4">
            {!isAuthenticated ? (
              <>
                <div className="flex flex-col space-y-2 pt-2">
                  <Link to="/login" onClick={toggleMenu}>
                    <Button variant="outline" className="w-full">Log In</Button>
                  </Link>
                  <Link to="/register" onClick={toggleMenu}>
                    <Button className="w-full">Sign Up</Button>
                  </Link>
                </div>
              </>
            ) : (
              <>
                <Link to="/dashboard" className="text-foreground py-2 px-4 hover:bg-muted rounded-md" onClick={toggleMenu}>
                  Dashboard
                </Link>
                <Link to="/clients" className="text-foreground py-2 px-4 hover:bg-muted rounded-md" onClick={toggleMenu}>
                  Clients
                </Link>
                <Link to="/training" className="text-foreground py-2 px-4 hover:bg-muted rounded-md" onClick={toggleMenu}>
                  AI Training
                </Link>
                <Link to="/campaigns" className="text-foreground py-2 px-4 hover:bg-muted rounded-md" onClick={toggleMenu}>
                  Campaigns
                </Link>
                <Link to="/history" className="text-foreground py-2 px-4 hover:bg-muted rounded-md" onClick={toggleMenu}>
                  History
                </Link>
                <Link to="/analytics" className="text-foreground py-2 px-4 hover:bg-muted rounded-md" onClick={toggleMenu}>
                  Analytics
                </Link>
                <Button variant="outline" className="w-full" onClick={() => console.log('Logout')}>
                  Logout
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;
