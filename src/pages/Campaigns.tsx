
import React from 'react';
import Navbar from '@/components/Navbar';
import CampaignControls from '@/components/CampaignControls';
import { Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { campaignService } from '@/services/campaignService';
import { webhookService } from '@/services/webhookService';

const CampaignsPage = () => {
  const { toast } = useToast();
  
  const handleStartCampaign = async () => {
    try {
      const campaigns = await campaignService.getCampaigns();
      
      // Get the first draft campaign or create a new one if none exists
      let campaign = campaigns.find(c => c.status === 'draft');
      
      if (!campaign) {
        // Create a simple campaign if none exists
        campaign = await campaignService.createCampaign({
          name: "Quick Campaign",
          status: 'draft',
          total_calls: 0,
          answered_calls: 0,
          start_date: null,
          end_date: null
        });
        
        toast({
          title: "Campaign Created",
          description: "New quick campaign has been created and started.",
        });
      }
      
      // Update campaign status to active
      await campaignService.updateCampaign(campaign.id, {
        status: 'active',
        start_date: new Date().toISOString()
      });
      
      // Trigger webhook for the campaign
      await webhookService.triggerCallWebhook({
        action: 'start_campaign',
        campaign_id: campaign.id,
        additional_data: {
          campaign_name: campaign.name,
          client_count: campaign.total_calls || 0,
          vapi_caller_id: "97141b30-c5bc-4234-babb-d38b79452e2a"
        }
      });
      
      // Prepare bulk calls for the campaign
      const bulkCallResult = await webhookService.prepareBulkCallsForCampaign(campaign.id);
      
      toast({
        title: "Campaign Started",
        description: `Campaign is now active with ${bulkCallResult.totalCalls} calls scheduled.`,
      });
      
    } catch (error) {
      console.error('Error starting campaign:', error);
      toast({
        title: "Error",
        description: "Failed to start campaign. Please try again.",
        variant: "destructive"
      });
    }
  };
  
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 pt-28 pb-16">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Campaigns</h1>
          <Button 
            onClick={handleStartCampaign} 
            className="bg-secondary hover:bg-secondary/90"
            size="lg"
          >
            <Phone className="mr-2 h-5 w-5" />
            Start Campaign
          </Button>
        </div>
        <CampaignControls />
      </div>
    </div>
  );
};

export default CampaignsPage;
