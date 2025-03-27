
import React from 'react';
import Navbar from '@/components/Navbar';
import CampaignControls from '@/components/CampaignControls';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Create a client
const queryClient = new QueryClient();

const DashboardPage = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-28 pb-16">
          <CampaignControls />
        </div>
      </div>
    </QueryClientProvider>
  );
};

export default DashboardPage;
