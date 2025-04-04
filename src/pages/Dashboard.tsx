
import React from 'react';
import Navbar from '@/components/Navbar';
import Dashboard from '@/components/dashboard';

const DashboardPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-28 pb-16">
        <Dashboard />
      </div>
    </div>
  );
};

export default DashboardPage;
