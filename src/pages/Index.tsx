
import React from 'react';
import Navbar from '@/components/Navbar';
import Hero from '@/components/Hero';
import { useIsMobile } from '@/hooks/use-mobile';

const Index = () => {
  const isMobile = useIsMobile();

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className={isMobile ? "pt-16" : "pt-20"}>
        <Hero />
      </div>
    </div>
  );
};

export default Index;
