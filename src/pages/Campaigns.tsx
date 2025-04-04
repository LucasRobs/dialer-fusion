import React from 'react';
import Navbar from '@/components/Navbar';
import CampaignControls from '@/components/CampaignControls';
import { useAuth } from '@/contexts/AuthContext';

const CampaignsPage = () => {
  const { user } = useAuth();
  
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 pt-28 pb-16">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Campanhas</h1>
        </div>
        {user ? (
          <CampaignControls />
        ) : (
          <div className="p-8 text-center bg-muted/20 rounded-lg border border-muted">
            <h3 className="text-xl font-semibold mb-4">Por favor, faça login</h3>
            <p className="text-muted-foreground mb-4">
              Você precisa estar logado para visualizar suas campanhas.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CampaignsPage;
