
import React from 'react';
import { Link } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import CampaignControls from '@/components/CampaignControls';
import { BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';

const CampaignsPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 pt-28 pb-16">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Campaigns</h1>
          <Link to="/analytics">
            <Button 
              className="bg-secondary hover:bg-secondary/90"
              size="lg"
            >
              <BarChart3 className="mr-2 h-5 w-5" />
              Analytics
            </Button>
          </Link>
        </div>
        <CampaignControls />
      </div>
    </div>
  );
};

export default CampaignsPage;
