
import React from 'react';
import Navbar from '@/components/Navbar';
import ContactHistory from '@/components/ContactHistory';

const HistoryPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-28 pb-16">
        <ContactHistory />
      </div>
    </div>
  );
};

export default HistoryPage;
