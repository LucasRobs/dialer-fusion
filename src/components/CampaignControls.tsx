
import React, { useState, useEffect } from 'react';
import {
  PauseCircle,
  StopCircle,
  Users,
  Settings,
  Save,
  BarChart3,
  Calendar,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardFooter 
} from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import WorkflowStatus from '@/components/WorkflowStatus';
import { webhookService } from '@/services/webhookService';
import { campaignService } from '@/services/campaignService';
import { useQuery } from '@tanstack/react-query';

const CampaignControls = () => {
  const [campaigns, setCampaigns] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [newCampaign, setNewCampaign] = useState({
    name: '',
    clientGroup: '',
    aiProfile: '',
  });
  
  const { toast } = useToast();
  
  // Fetch real client groups from supabase
  const { data: clientGroups = [], isLoading: isLoadingGroups } = useQuery({
    queryKey: ['clientGroups'],
    queryFn: async () => {
      try {
        // Get clients from supabase
        const { data, error } = await supabase
          .from('clients')
          .select('status, count')
          .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
          .group('status');
        
        if (error) throw error;
        
        // Get all clients count
        const { count: totalCount } = await supabase
          .from('clients')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', (await supabase.auth.getUser()).data.user?.id);
        
        // Format client groups
        const groups = [
          { id: 'all', name: 'All Clients', count: totalCount || 0 },
          ...data.map((group, index) => ({
            id: index + 1,
            name: `${group.status} Clients`,
            count: group.count
          }))
        ];
        
        return groups;
      } catch (error) {
        console.error('Error fetching client groups:', error);
        return [
          { id: 'all', name: 'All Clients', count: 0 }
        ];
      }
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
        id: campaign.id,
        name: campaign.name || 'Untitled Campaign',
        status: campaign.status || 'draft',
        progress: campaign.total_calls > 0 
          ? Math.round((campaign.answered_calls / campaign.total_calls) * 100) 
          : 0,
        clientGroup: 'Active Clients',
        clientCount: campaign.total_calls || 0,
        completedCalls: campaign.answered_calls || 0,
        aiProfile: 'Sales Assistant',
        startDate: campaign.start_date 
          ? new Date(campaign.start_date).toLocaleDateString() 
          : new Date().toLocaleDateString()
      }));
      
      setCampaigns(formattedCampaigns);
      setIsLoading(false);
    }
  }, [supabaseCampaigns]);
  
  const handleStartCampaign = async (id: number) => {
    try {
      setCampaigns(campaigns.map(campaign => 
        campaign.id === id ? { ...campaign, status: 'active' } : campaign
      ));
      
      const campaign = campaigns.find(c => c.id === id);
      
      if (campaign) {
        await campaignService.updateCampaign(id, {
          status: 'active',
          start_date: new Date().toISOString()
        });
        
        await webhookService.triggerCallWebhook({
          action: 'start_campaign',
          campaign_id: campaign.id,
          additional_data: {
            campaign_name: campaign.name,
            client_count: campaign.clientCount,
            ai_profile: campaign.aiProfile,
            vapi_caller_id: "97141b30-c5bc-4234-babb-d38b79452e2a"
          }
        });
        
        // Get all clients associated with this campaign
        const clients = await campaignService.getClientDataForCampaign(campaign.id);
        
        if (clients && clients.length > 0) {
          // Send each client to webhook individually
          let successCount = 0;
          let failCount = 0;
          
          for (const client of clients) {
            try {
              const result = await webhookService.triggerCallWebhook({
                action: 'start_call',
                campaign_id: campaign.id,
                client_id: client.id,
                client_name: client.name,
                client_phone: client.phone,
                additional_data: {
                  vapi_caller_id: "97141b30-c5bc-4234-babb-d38b79452e2a",
                  call_type: 'campaign_call'
                }
              });
              
              if (result.success) {
                successCount++;
              } else {
                failCount++;
              }
            } catch (err) {
              console.error(`Error sending webhook for client ${client.id}:`, err);
              failCount++;
            }
          }
          
          toast({
            title: "Campanha Iniciada",
            description: `Campanha iniciada com ${successCount} ligações enviadas (${failCount} falhas).`,
          });
        } else {
          toast({
            title: "Campanha Iniciada",
            description: "Campanha iniciada, mas não há clientes associados.",
          });
        }
        
        refetchCampaigns();
      }
    } catch (error) {
      console.error('Erro ao iniciar campanha:', error);
      
      toast({
        title: "Erro",
        description: "Falha ao iniciar a campanha. Por favor, tente novamente.",
        variant: "destructive"
      });
    }
  };
  
  const handleDeleteCampaign = async (id: number) => {
    try {
      setCampaigns(campaigns.filter(campaign => campaign.id !== id));
      
      await campaignService.deleteCampaign(id);
      
      toast({
        title: "Campanha Excluída",
        description: "A campanha foi excluída com sucesso.",
      });
      
      refetchCampaigns();
    } catch (error) {
      console.error('Erro ao excluir campanha:', error);
      
      toast({
        title: "Erro ao Excluir",
        description: "Houve um problema ao excluir a campanha. Por favor, tente novamente.",
        variant: "destructive"
      });
      
      refetchCampaigns();
    }
  };
  
  const handlePauseCampaign = async (id: number) => {
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
  
  const handleStopCampaign = async (id: number) => {
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
            completed_calls: campaign.completedCalls
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
  
  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newCampaign.name || !newCampaign.clientGroup || !newCampaign.aiProfile) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }
    
    const selectedGroup = clientGroups.find(group => group.id.toString() === newCampaign.clientGroup);
    const clientCount = selectedGroup ? selectedGroup.count : 0;
    
    const selectedProfile = aiProfiles.find(profile => profile.id.toString() === newCampaign.aiProfile);
    const aiProfileName = selectedProfile ? selectedProfile.name : '';
    
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
          ai_profile: aiProfileName,
          client_group: selectedGroup?.name,
          vapi_caller_id: "97141b30-c5bc-4234-babb-d38b79452e2a"
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
  
  return (
    <div className="container mx-auto p-4 max-w-7xl">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">Suas Campanhas</h2>
            <Button size="sm">
              <BarChart3 className="h-4 w-4 mr-2" />
              Ver Relatórios
            </Button>
          </div>
          
          <WorkflowStatus />
          
          {isLoading ? (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-muted-foreground">Carregando campanhas...</p>
                </div>
              </CardContent>
            </Card>
          ) : campaigns.length > 0 ? (
            <div className="space-y-4">
              {campaigns.map((campaign) => (
                <Card key={campaign.id} className="overflow-hidden">
                  <div className={`h-1.5 w-full ${getStatusColor(campaign.status)}`}></div>
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-xl">{campaign.name}</CardTitle>
                        <CardDescription>
                          Started: {campaign.startDate} · {campaign.clientGroup} ({campaign.clientCount} clients)
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
                          <span>Progress: {campaign.completedCalls} of {campaign.clientCount} calls completed</span>
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
                          <Button variant="outline" size="sm" className="flex-1" onClick={() => handlePauseCampaign(campaign.id)}>
                            <PauseCircle className="h-4 w-4 mr-2" />
                            Pause
                          </Button>
                          <Button variant="outline" size="sm" className="flex-1" onClick={() => handleStopCampaign(campaign.id)}>
                            <StopCircle className="h-4 w-4 mr-2" />
                            Stop
                          </Button>
                        </>
                      ) : campaign.status === 'paused' ? (
                        <>
                          <Button variant="outline" size="sm" className="flex-1" onClick={() => handleStartCampaign(campaign.id)}>
                            Resume
                          </Button>
                          <Button variant="outline" size="sm" className="flex-1" onClick={() => handleStopCampaign(campaign.id)}>
                            <StopCircle className="h-4 w-4 mr-2" />
                            Stop
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button className="flex-1" variant="outline" size="sm" onClick={() => handleStartCampaign(campaign.id)}>
                            Start
                          </Button>
                          <Button variant="outline" size="sm" className="flex-1" onClick={() => handleDeleteCampaign(campaign.id)}>
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </Button>
                        </>
                      )}
                    </div>
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : (
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
          )}
        </div>
        
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Criar Nova Campanha</CardTitle>
              <CardDescription>
                Configure uma nova campanha de chamadas usando seu assistente de IA
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateCampaign} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Campaign Name</Label>
                  <Input
                    id="name"
                    placeholder="Summer Promotion 2023"
                    value={newCampaign.name}
                    onChange={(e) => setNewCampaign({...newCampaign, name: e.target.value})}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="clientGroup">Select Client Group</Label>
                  <Select
                    value={newCampaign.clientGroup}
                    onValueChange={(value) => setNewCampaign({...newCampaign, clientGroup: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a client group" />
                    </SelectTrigger>
                    <SelectContent>
                      {isLoadingGroups ? (
                        <SelectItem value="loading" disabled>Loading client groups...</SelectItem>
                      ) : (
                        clientGroups.map((group) => (
                          <SelectItem key={group.id} value={group.id.toString()}>
                            {group.name} ({group.count} clients)
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="aiProfile">Select AI Profile</Label>
                  <Select
                    value={newCampaign.aiProfile}
                    onValueChange={(value) => setNewCampaign({...newCampaign, aiProfile: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select an AI profile" />
                    </SelectTrigger>
                    <SelectContent>
                      {aiProfiles.map((profile) => (
                        <SelectItem key={profile.id} value={profile.id.toString()}>
                          {profile.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    {newCampaign.aiProfile && 
                      aiProfiles.find(p => p.id.toString() === newCampaign.aiProfile)?.description}
                  </p>
                </div>
                
                <div className="pt-4">
                  <Button type="submit" className="w-full">
                    <Save className="h-4 w-4 mr-2" />
                    Create Campaign
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default CampaignControls;
