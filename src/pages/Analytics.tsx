
import React from 'react';
import Navbar from '@/components/Navbar';
import Analytics from '@/components/Analytics';

const AnalyticsPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-28 pb-16">
        <Analytics />
      </div>
    </div>
  );
};

export default AnalyticsPage;
