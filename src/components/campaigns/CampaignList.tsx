
import React from 'react';
import { BarChart3, Play, PauseCircle, StopCircle, Trash } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Campaign } from '@/services/campaignService';

interface CampaignListProps {
  campaigns: Campaign[];
  isLoading: boolean;
  onStartCampaign: (id: number) => void;
  onPauseCampaign: (id: number) => void;
  onStopCampaign: (id: number) => void;
  onDeleteCampaign: (id: number) => void;
}

const CampaignList: React.FC<CampaignListProps> = ({
  campaigns,
  isLoading,
  onStartCampaign,
  onPauseCampaign,
  onStopCampaign,
  onDeleteCampaign
}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-secondary text-white';
      case 'paused':
        return 'bg-yellow-500/80 text-white';
      case 'completed':
        return 'bg-blue-500/80 text-white';
      case 'stopped':
        return 'bg-destructive/80 text-white';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Carregando campanhas...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (campaigns.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <div className="rounded-full bg-muted p-3 mb-4">
            <Calendar className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-semibold mb-2">No Campaigns Yet</h3>
          <p className="text-muted-foreground text-center mb-4">
            Create your first campaign to start reaching out to your clients.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {campaigns.map((campaign) => (
        <Card key={campaign.id} className="overflow-hidden">
          <div className={`h-1.5 w-full ${getStatusColor(campaign.status)}`}></div>
          <CardHeader className="pb-2">
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-xl">{campaign.name}</CardTitle>
                <CardDescription>
                  Started: {campaign.start_date ? new Date(campaign.start_date).toLocaleDateString() : 'Not started'} · 
                  {campaign.clientGroup} ({campaign.total_calls} clients)
                </CardDescription>
              </div>
              <div className={`px-2 py-1 rounded text-xs uppercase font-semibold ${getStatusColor(campaign.status)}`}>
                {campaign.status}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-1 text-sm">
                  <span>Progress: {campaign.answered_calls} of {campaign.total_calls} calls completed</span>
                  <span>{campaign.progress}%</span>
                </div>
                <Progress value={campaign.progress} className="h-2" />
              </div>
              
              <div className="flex text-sm text-muted-foreground">
                <div className="flex items-center mr-4">
                  <Users className="h-4 w-4 mr-1" />
                  <span>{campaign.clientGroup}</span>
                </div>
                <div className="flex items-center">
                  <Settings className="h-4 w-4 mr-1" />
                  <span>{campaign.aiProfile}</span>
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="border-t bg-muted/10 pt-4">
            <div className="flex gap-2 w-full">
              {campaign.status === 'active' ? (
                <>
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => onPauseCampaign(campaign.id)}>
                    <PauseCircle className="h-4 w-4 mr-2" />
                    Pause
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => onStopCampaign(campaign.id)}>
                    <StopCircle className="h-4 w-4 mr-2" />
                    Stop
                  </Button>
                </>
              ) : campaign.status === 'paused' ? (
                <>
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => onStartCampaign(campaign.id)}>
                    <Play className="h-4 w-4 mr-2" />
                    Resume
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => onStopCampaign(campaign.id)}>
                    <StopCircle className="h-4 w-4 mr-2" />
                    Stop
                  </Button>
                </>
              ) : campaign.status === 'ready' ? (
                <Button className="flex-1" onClick={() => onStartCampaign(campaign.id)}>
                  <Play className="h-4 w-4 mr-2" />
                  Start Campaign
                </Button>
              ) : null}
              
              <Button variant="outline" size="sm" className="flex-1">
                <BarChart3 className="h-4 w-4 mr-2" />
                Details
              </Button>
              
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" className="flex-1">
                    <Trash className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Campaign</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete this campaign? This action cannot be undone.
                      {campaign.status === 'active' && 
                        " This campaign is currently active and will be stopped before deletion."}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => onDeleteCampaign(campaign.id)}>
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
};

export default CampaignList;

// Missing import
import { Calendar, Settings, Users } from 'lucide-react';
