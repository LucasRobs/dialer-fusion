
import React from 'react';
import { BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CampaignHeaderProps {
  title: string;
}

const CampaignHeader: React.FC<CampaignHeaderProps> = ({ title }) => {
  return (
    <div className="flex justify-between items-center">
      <h2 className="text-2xl font-bold">{title}</h2>
      <Button size="sm">
        <BarChart3 className="h-4 w-4 mr-2" />
        Ver Relatórios
      </Button>
    </div>
  );
};

export default CampaignHeader;
