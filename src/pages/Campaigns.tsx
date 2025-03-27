
import React from 'react';
import Navbar from '@/components/Navbar';
import CampaignControls from '@/components/CampaignControls';

const CampaignsPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-28 pb-16">
        <CampaignControls />
      </div>
    </div>
  );
};

export default CampaignsPage;
