import React, { useState } from 'react';
import {
  Play,
  PauseCircle,
  StopCircle,
  Users,
  Settings,
  Save,
  BarChart3,
  Calendar,
  ArrowRight,
  Phone as PhoneIcon,
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

// Dummy client groups
const clientGroups = [
  { id: 1, name: 'All Clients', count: 1250 },
  { id: 2, name: 'Active Clients', count: 876 },
  { id: 3, name: 'New Leads', count: 342 },
  { id: 4, name: 'Past Customers', count: 528 },
];

// Dummy AI profiles
const aiProfiles = [
  { id: 1, name: 'Sales Assistant', description: 'Optimized for sales calls and conversions' },
  { id: 2, name: 'Customer Support', description: 'Focused on helping customers with issues' },
  { id: 3, name: 'Appointment Setter', description: 'Specialized in booking appointments' },
  { id: 4, name: 'Survey Collector', description: 'Designed to collect feedback and survey data' },
];

const CampaignControls = () => {
  const [campaigns, setCampaigns] = useState([
    { 
      id: 1, 
      name: 'Summer Promotion 2023', 
      status: 'active', 
      progress: 60, 
      clientGroup: 'Active Clients',
      clientCount: 876,
      completedCalls: 526,
      aiProfile: 'Sales Assistant',
      startDate: new Date().toLocaleDateString(),
    },
    { 
      id: 2, 
      name: 'Customer Feedback', 
      status: 'paused', 
      progress: 35, 
      clientGroup: 'Past Customers',
      clientCount: 528,
      completedCalls: 184,
      aiProfile: 'Survey Collector',
      startDate: new Date(Date.now() - 86400000 * 2).toLocaleDateString(),
    },
    { 
      id: 3, 
      name: 'Appointment Reminder', 
      status: 'completed', 
      progress: 100, 
      clientGroup: 'Active Clients',
      clientCount: 192,
      completedCalls: 192,
      aiProfile: 'Appointment Setter',
      startDate: new Date(Date.now() - 86400000 * 5).toLocaleDateString(),
    }
  ]);
  
  const [newCampaign, setNewCampaign] = useState({
    name: '',
    clientGroup: '',
    aiProfile: '',
  });
  
  const { toast } = useToast();
  
  const handleStartCampaign = async (id: number) => {
    // Atualiza o estado
    setCampaigns(campaigns.map(campaign => 
      campaign.id === id ? { ...campaign, status: 'active' } : campaign
    ));
    
    // Encontra a campanha atual
    const campaign = campaigns.find(c => c.id === id);
    
    // Dispara o webhook para iniciar as ligações
    if (campaign) {
      try {
        await webhookService.triggerCallWebhook({
          action: 'start_campaign',
          campaign_id: campaign.id,
          additional_data: {
            campaign_name: campaign.name,
            client_count: campaign.clientCount,
            ai_profile: campaign.aiProfile
          }
        });
        
        toast({
          title: "Campanha Iniciada",
          description: "Sua campanha de ligações está ativa e em execução.",
        });
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
  
  const handlePauseCampaign = async (id: number) => {
    // Atualiza o estado
    setCampaigns(campaigns.map(campaign => 
      campaign.id === id ? { ...campaign, status: 'paused' } : campaign
    ));
    
    // Encontra a campanha atual
    const campaign = campaigns.find(c => c.id === id);
    
    // Dispara o webhook para pausar as ligações
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
    // Atualiza o estado
    setCampaigns(campaigns.map(campaign => 
      campaign.id === id ? { ...campaign, status: 'stopped' } : campaign
    ));
    
    // Encontra a campanha atual
    const campaign = campaigns.find(c => c.id === id);
    
    // Dispara o webhook para parar as ligações
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
    
    // Validation
    if (!newCampaign.name || !newCampaign.clientGroup || !newCampaign.aiProfile) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }
    
    // Get client count based on selected group
    const selectedGroup = clientGroups.find(group => group.id.toString() === newCampaign.clientGroup);
    const clientCount = selectedGroup ? selectedGroup.count : 0;
    
    // Get AI profile name
    const selectedProfile = aiProfiles.find(profile => profile.id.toString() === newCampaign.aiProfile);
    const aiProfileName = selectedProfile ? selectedProfile.name : '';
    
    // Create new campaign
    const newId = Math.max(0, ...campaigns.map(c => c.id)) + 1;
    const createdCampaign = {
      id: newId,
      name: newCampaign.name,
      status: 'ready',
      progress: 0,
      clientGroup: selectedGroup ? selectedGroup.name : '',
      clientCount,
      completedCalls: 0,
      aiProfile: aiProfileName,
      startDate: new Date().toLocaleDateString(),
    };
    
    // Adiciona a nova campanha ao estado
    setCampaigns([...campaigns, createdCampaign]);
    
    // Notifica o sistema de ligações sobre a nova campanha
    try {
      await webhookService.triggerCallWebhook({
        action: 'create_campaign',
        campaign_id: newId,
        additional_data: {
          campaign_name: createdCampaign.name,
          client_count: clientCount,
          ai_profile: aiProfileName,
          client_group: selectedGroup?.name
        }
      });
      
      toast({
        title: "Campanha Criada",
        description: "Sua nova campanha está pronta para iniciar.",
      });
    } catch (error) {
      console.error('Erro ao notificar sistema de ligações:', error);
      
      toast({
        title: "Campanha Criada",
        description: "Campanha criada, mas houve um erro ao notificar o sistema de ligações.",
        variant: "destructive"
      });
    }
    
    // Reset form
    setNewCampaign({
      name: '',
      clientGroup: '',
      aiProfile: '',
    });
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
        {/* Campaign List */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">Suas Campanhas</h2>
            <Button size="sm">
              <BarChart3 className="h-4 w-4 mr-2" />
              Ver Relatórios
            </Button>
          </div>
          
          {/* Status do Workflow - adicionado aqui */}
          <WorkflowStatus />
          
          {campaigns.length > 0 ? (
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
                            <Play className="h-4 w-4 mr-2" />
                            Resume
                          </Button>
                          <Button variant="outline" size="sm" className="flex-1" onClick={() => handleStopCampaign(campaign.id)}>
                            <StopCircle className="h-4 w-4 mr-2" />
                            Stop
                          </Button>
                        </>
                      ) : campaign.status === 'ready' ? (
                        <Button className="flex-1" onClick={() => handleStartCampaign(campaign.id)}>
                          <Play className="h-4 w-4 mr-2" />
                          Start Campaign
                        </Button>
                      ) : null}
                      
                      <Button variant="outline" size="sm" className="flex-1">
                        <BarChart3 className="h-4 w-4 mr-2" />
                        Details
                      </Button>
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
        
        {/* Create Campaign Form */}
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
                      {clientGroups.map((group) => (
                        <SelectItem key={group.id} value={group.id.toString()}>
                          {group.name} ({group.count} clients)
                        </SelectItem>
                      ))}
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
