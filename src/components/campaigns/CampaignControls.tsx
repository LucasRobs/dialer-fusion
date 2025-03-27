
import React, { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { useQuery } from '@tanstack/react-query';
import { campaignService } from '@/services/campaignService';
import { webhookService } from '@/services/webhookService';
import WorkflowStatus from '@/components/WorkflowStatus';
import CampaignHeader from '@/components/campaigns/CampaignHeader';
import CampaignList from '@/components/campaigns/CampaignList';
import CampaignForm from '@/components/campaigns/CampaignForm';
import { ClientGroup, AIProfile } from '@/components/campaigns/CampaignForm';

// Fixed Vapi IDs that cannot be changed
const FIXED_VAPI_CALLER_ID = "97141b30-c5bc-4234-babb-d38b79452e2a";
const FIXED_VAPI_ASSISTANT_ID = "01646bac-c486-455b-bbc4-a2bc5a1da47c";

const CampaignControls = () => {
  const [campaigns, setCampaigns] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [newCampaign, setNewCampaign] = useState({
    name: '',
    clientGroup: '',
    aiProfile: '',
  });
  
  const { toast } = useToast();
  
  const { data: clientGroups = [] } = useQuery({
    queryKey: ['clientGroups'],
    queryFn: async () => {
      return [
        { id: 1, name: 'All Clients', count: 1250 },
        { id: 2, name: 'Active Clients', count: 876 },
        { id: 3, name: 'New Leads', count: 342 },
        { id: 4, name: 'Past Customers', count: 528 },
      ];
    }
  });
  
  const { data: aiProfiles = [] } = useQuery({
    queryKey: ['aiProfiles'],
    queryFn: async () => {
      return [
        { id: 1, name: 'Sales Assistant', description: 'Optimized for sales calls and conversions' },
        { id: 2, name: 'Customer Support', description: 'Focused on helping customers with issues' },
        { id: 3, name: 'Appointment Setter', description: 'Specialized in booking appointments' },
        { id: 4, name: 'Survey Collector', description: 'Designed to collect feedback and survey data' },
      ];
    }
  });
  
  const { data: supabaseCampaigns, refetch: refetchCampaigns } = useQuery({
    queryKey: ['campaigns'],
    queryFn: async () => {
      try {
        return await campaignService.getCampaigns();
      } catch (error) {
        console.error('Error fetching campaigns:', error);
        toast({
          title: "Error fetching campaigns",
          description: "Failed to load campaigns from database.",
          variant: "destructive"
        });
        return [];
      }
    }
  });
  
  useEffect(() => {
    if (supabaseCampaigns) {
      const formattedCampaigns = supabaseCampaigns.map(campaign => ({
        ...campaign,
        progress: campaign.total_calls > 0 
          ? Math.round((campaign.answered_calls / campaign.total_calls) * 100) 
          : 0,
        clientGroup: 'Active Clients',
        aiProfile: 'Sales Assistant',
      }));
      
      setCampaigns(formattedCampaigns);
      setIsLoading(false);
    }
  }, [supabaseCampaigns]);
  
  const handleCampaignChange = (field, value) => {
    setNewCampaign({...newCampaign, [field]: value});
  };
  
  const handleStartCampaign = async (id) => {
    setCampaigns(campaigns.map(campaign => 
      campaign.id === id ? { ...campaign, status: 'active' } : campaign
    ));
    
    const campaign = campaigns.find(c => c.id === id);
    
    if (campaign) {
      try {
        await campaignService.updateCampaign(id, {
          status: 'active',
          start_date: new Date().toISOString()
        });
        
        await webhookService.triggerCallWebhook({
          action: 'start_campaign',
          campaign_id: campaign.id,
          additional_data: {
            campaign_name: campaign.name,
            client_count: campaign.total_calls,
            ai_profile: campaign.aiProfile,
            vapi_caller_id: FIXED_VAPI_CALLER_ID
          }
        });
        
        const bulkCallResult = await webhookService.prepareBulkCallsForCampaign(campaign.id);
        
        toast({
          title: "Campanha Iniciada",
          description: `Sua campanha está ativa com ${bulkCallResult.totalCalls} ligações programadas (${bulkCallResult.successfulCalls} enviadas com sucesso).`,
        });
        
        refetchCampaigns();
      } catch (error) {
        console.error('Erro ao notificar sistema de ligações:', error);
        
        toast({
          title: "Campanha Iniciada",
          description: "Campanha iniciada, mas houve um erro ao notificar o sistema de ligações.",
          variant: "destructive"
        });
      }
    }
  };
  
  const handlePauseCampaign = async (id) => {
    setCampaigns(campaigns.map(campaign => 
      campaign.id === id ? { ...campaign, status: 'paused' } : campaign
    ));
    
    const campaign = campaigns.find(c => c.id === id);
    
    if (campaign) {
      try {
        await webhookService.triggerCallWebhook({
          action: 'pause_campaign',
          campaign_id: campaign.id,
          additional_data: {
            campaign_name: campaign.name,
            progress: campaign.progress
          }
        });
        
        toast({
          title: "Campanha Pausada",
          description: "Sua campanha de ligações foi pausada. Você pode retomá-la a qualquer momento.",
        });
      } catch (error) {
        console.error('Erro ao notificar sistema de ligações:', error);
        
        toast({
          title: "Campanha Pausada",
          description: "Campanha pausada, mas houve um erro ao notificar o sistema de ligações.",
          variant: "destructive"
        });
      }
    }
  };
  
  const handleStopCampaign = async (id) => {
    setCampaigns(campaigns.map(campaign => 
      campaign.id === id ? { ...campaign, status: 'stopped' } : campaign
    ));
    
    const campaign = campaigns.find(c => c.id === id);
    
    if (campaign) {
      try {
        await webhookService.triggerCallWebhook({
          action: 'stop_campaign',
          campaign_id: campaign.id,
          additional_data: {
            campaign_name: campaign.name,
            progress: campaign.progress,
            completed_calls: campaign.answered_calls
          }
        });
        
        toast({
          title: "Campanha Interrompida",
          description: "Sua campanha de ligações foi interrompida.",
        });
      } catch (error) {
        console.error('Erro ao notificar sistema de ligações:', error);
        
        toast({
          title: "Campanha Interrompida",
          description: "Campanha interrompida, mas houve um erro ao notificar o sistema de ligações.",
          variant: "destructive"
        });
      }
    }
  };
  
  const handleDeleteCampaign = async (id) => {
    try {
      const campaign = campaigns.find(c => c.id === id);
      if (campaign && campaign.status === 'active') {
        await handleStopCampaign(id);
      }
      
      await campaignService.deleteCampaign(id);
      
      toast({
        title: "Campanha Excluída",
        description: "A campanha foi excluída com sucesso.",
      });
      
      refetchCampaigns();
    } catch (error) {
      console.error('Erro ao excluir campanha:', error);
      
      toast({
        title: "Erro ao Excluir Campanha",
        description: "Houve um problema ao excluir a campanha. Por favor, tente novamente.",
        variant: "destructive"
      });
    }
  };
  
  const handleCreateCampaign = async (e) => {
    e.preventDefault();
    
    if (!newCampaign.name || !newCampaign.clientGroup) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }
    
    const selectedGroup = clientGroups.find(group => group.id.toString() === newCampaign.clientGroup);
    const clientCount = selectedGroup ? selectedGroup.count : 0;
    
    try {
      const createdCampaign = await campaignService.createCampaign({
        name: newCampaign.name,
        status: 'draft',
        total_calls: clientCount,
        answered_calls: 0,
        start_date: null,
        end_date: null
      });
      
      await webhookService.triggerCallWebhook({
        action: 'create_campaign',
        campaign_id: createdCampaign.id,
        additional_data: {
          campaign_name: createdCampaign.name,
          client_count: clientCount,
          ai_profile: 'Sales Assistant',
          client_group: selectedGroup?.name,
          vapi_caller_id: FIXED_VAPI_CALLER_ID
        }
      });
      
      toast({
        title: "Campanha Criada",
        description: "Sua nova campanha está pronta para iniciar.",
      });
      
      setNewCampaign({
        name: '',
        clientGroup: '',
        aiProfile: '',
      });
      
      refetchCampaigns();
    } catch (error) {
      console.error('Erro ao criar campanha:', error);
      
      toast({
        title: "Erro ao Criar Campanha",
        description: "Houve um problema ao criar sua campanha. Por favor, tente novamente.",
        variant: "destructive"
      });
    }
  };
  
  return (
    <div className="container mx-auto p-4 max-w-7xl">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <CampaignHeader title="Suas Campanhas" />
          <WorkflowStatus />
          <CampaignList 
            campaigns={campaigns}
            isLoading={isLoading}
            onStartCampaign={handleStartCampaign}
            onPauseCampaign={handlePauseCampaign}
            onStopCampaign={handleStopCampaign}
            onDeleteCampaign={handleDeleteCampaign}
          />
        </div>
        
        <div>
          <CampaignForm 
            newCampaign={newCampaign}
            onCampaignChange={handleCampaignChange}
            onCreateCampaign={handleCreateCampaign}
            clientGroups={clientGroups}
          />
        </div>
      </div>
    </div>
  );
};

export default CampaignControls;
