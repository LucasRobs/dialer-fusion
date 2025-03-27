
import React from 'react';
import Navbar from '@/components/Navbar';
import VapiAssistantTransfer from '@/components/VapiAssistantTransfer';

const VapiAssistantPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-28 pb-16">
        <VapiAssistantTransfer />
      </div>
    </div>
  );
};

export default VapiAssistantPage;
