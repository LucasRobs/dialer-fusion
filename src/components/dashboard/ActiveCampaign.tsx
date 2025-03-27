
import React from 'react';
import { Link } from 'react-router-dom';
import { PhoneOff, BarChart3 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface CampaignStatus {
  name: string;
  progress: number;
  startTime: string;
  callsMade: number;
  callsRemaining: number;
}

interface ActiveCampaignProps {
  campaign: CampaignStatus;
}

const ActiveCampaign: React.FC<ActiveCampaignProps> = ({ campaign }) => {
  return (
    <Card className="mb-8 border-l-4 border-l-secondary">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl flex items-center">
              <div className="h-3 w-3 rounded-full bg-secondary animate-pulse mr-2"></div>
              Active Campaign: {campaign.name}
            </CardTitle>
            <p className="text-sm text-foreground/70">Started at {campaign.startTime}</p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="flex items-center gap-1">
              <PhoneOff size={16} />
              <span>Stop Campaign</span>
            </Button>
            <Link to="/campaigns">
              <Button size="sm" className="flex items-center gap-1">
                <BarChart3 size={16} />
                <span>View Details</span>
              </Button>
            </Link>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="w-full h-2 bg-gray-200 rounded-full mt-3">
          <div 
            className="h-full bg-secondary rounded-full transition-all duration-500 ease-in-out"
            style={{ width: `${campaign.progress}%` }}
          ></div>
        </div>
        <div className="flex justify-between mt-2 text-sm text-foreground/70">
          <span>{campaign.callsMade} calls made</span>
          <span>{campaign.callsRemaining} calls remaining</span>
        </div>
      </CardContent>
    </Card>
  );
};

export default ActiveCampaign;
