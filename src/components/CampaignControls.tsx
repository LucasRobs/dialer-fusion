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
  RefreshCw,
  Loader2,
  Play,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
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
import { webhookService } from '@/services/webhookService';
import { campaignService } from '@/services/campaignService';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { clientGroupService } from '@/services/clientGroupService';
import { supabase } from '@/lib/supabase';

const getStatusColor = (status: string): string => {
  switch (status) {
    case 'active':
      return 'bg-green-500';
    case 'draft':
      return 'bg-yellow-500';
    case 'completed':
      return 'bg-blue-500';
    case 'paused':
      return 'bg-gray-500';
    default:
      return 'bg-red-500';
  }
};

const CampaignControls = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  const [campaigns, setCampaigns] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isStartingCampaign, setIsStartingCampaign] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState<{[key: string]: boolean}>({});
  const [newCampaign, setNewCampaign] = useState({
    name: '',
    clientGroup: '',
    aiProfile: '',
  });

  const { data: userClientGroups = [], isLoading: isLoadingGroups } = useQuery({
    queryKey: ['userClientGroups'],
    queryFn: async () => {
      try {
        const groups = await clientGroupService.getClientGroups();
        const groupsWithCounts = await Promise.all(
          groups.map(async (group) => {
            const { count, error } = await supabase
              .from('client_group_members')
              .select('*', { count: 'exact', head: true })
              .eq('group_id', group.id);

            if (error) {
              console.error(`Erro ao contar clientes no grupo ${group.id}:`, error);
              return { ...group, client_count: 0 };
            }

            return { ...group, client_count: count || 0 };
          })
        );

        return groupsWithCounts;
      } catch (error) {
        console.error('Erro ao buscar grupos de clientes:', error);
        return [];
      }
    },
    enabled: !!user?.id,
  });

  const { data: supabaseCampaignsData, refetch: refetchCampaigns } = useQuery({
    queryKey: ['campaigns'],
    queryFn: async () => await campaignService.getCampaigns(),
    staleTime: 0,
  });

  const { data: assistants = [], isLoading: isLoadingAssistants, refetch: refetchAssistants } = useQuery({
    queryKey: ['assistants', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      return await webhookService.getLocalAssistants(user.id);
    },
    enabled: !!user?.id,
  });

  const [selectedGroupClients, setSelectedGroupClients] = useState([]);
  const [isLoadingClients, setIsLoadingClients] = useState(false);

  const fetchClientsForGroup = async (groupId) => {
    if (!groupId) return;
    
    setIsLoadingClients(true);
    try {
      const { data: memberData, error: memberError } = await supabase
        .from('client_group_members')
        .select('client_id')
        .eq('group_id', groupId);

      if (memberError) throw memberError;

      if (memberData && memberData.length > 0) {
        const clientIds = memberData.map(item => item.client_id);
        
        const { data: clientData, error: clientError } = await supabase
          .from('clients')
          .select('*')
          .in('id', clientIds);

        if (clientError) throw clientError;
        
        setSelectedGroupClients(clientData || []);
      } else {
        setSelectedGroupClients([]);
      }
    } catch (error) {
      console.error('Error fetching clients for group:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os clientes deste grupo',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingClients(false);
    }
  };

  useEffect(() => {
    if (newCampaign.clientGroup) {
      fetchClientsForGroup(newCampaign.clientGroup);
    }
  }, [newCampaign.clientGroup]);

  useEffect(() => {
    if (supabaseCampaignsData) {
      const formattedCampaigns = supabaseCampaignsData.map((campaign) => ({
        id: campaign.id,
        name: campaign.name || 'Untitled Campaign',
        status: campaign.status || 'draft',
        clientGroup: campaign.client_group_id,
        clientCount: campaign.total_calls || 0,
        completedCalls: campaign.answered_calls || 0,
        aiProfile: campaign.assistant_id || '',
        startDate: campaign.start_date
          ? new Date(campaign.start_date).toLocaleDateString()
          : new Date().toLocaleDateString(),
      }));

      setCampaigns(formattedCampaigns);
      setIsLoading(false);
    }
  }, [supabaseCampaignsData]);

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newCampaign.name || !newCampaign.clientGroup || !newCampaign.aiProfile) {
      toast({
        title: 'Erro',
        description: 'Por favor, preencha todos os campos obrigatórios',
        variant: 'destructive',
      });
      return;
    }

    const selectedGroup = userClientGroups.find(
      (group) => group.id.toString() === newCampaign.clientGroup
    );
    const clientCount = selectedGroup ? selectedGroup.client_count || 0 : 0;

    const selectedAssistant = assistants.find(
      (assistant) => assistant.id.toString() === newCampaign.aiProfile
    );

    if (!selectedAssistant) {
      toast({
        title: 'Erro',
        description: 'Por favor, selecione um assistente de IA válido',
        variant: 'destructive',
      });
      return;
    }

    try {
      localStorage.setItem('selected_assistant', JSON.stringify(selectedAssistant));
      console.log('Assistente selecionado para campanha:', selectedAssistant);

      setIsSubmitting(true);

      const createdCampaign = await campaignService.createCampaign({
        name: newCampaign.name,
        status: 'draft',
        total_calls: clientCount,
        answered_calls: 0,
        start_date: null,
        end_date: null,
        user_id: user?.id,
        client_group_id: newCampaign.clientGroup !== 'all' ? newCampaign.clientGroup : null,
        assistant_id: newCampaign.aiProfile,
      });

      toast({
        title: 'Campanha Criada',
        description: `Sua campanha "${newCampaign.name}" foi criada com o assistente "${selectedAssistant.name}"`,
      });

      setNewCampaign({
        name: '',
        clientGroup: '',
        aiProfile: '',
      });

      await refetchCampaigns();
    } catch (error) {
      console.error('Erro ao criar campanha:', error);
      toast({
        title: 'Erro ao Criar Campanha',
        description: 'Houve um problema ao criar sua campanha. Por favor, tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartCampaign = async (campaign) => {
    setIsActionLoading(prev => ({ ...prev, [campaign.id]: true }));
    
    try {
      let selectedAssistant = assistants.find(
        (assistant) => assistant.id === campaign.aiProfile || assistant.assistant_id === campaign.aiProfile
      );
      
      if (!selectedAssistant) {
        try {
          const storedAssistant = localStorage.getItem('selected_assistant');
          if (storedAssistant) {
            const parsedAssistant = JSON.parse(storedAssistant);
            console.log("Retrieved assistant from localStorage:", parsedAssistant);
            selectedAssistant = parsedAssistant;
          }
        } catch (e) {
          console.error("Error parsing stored assistant data:", e);
        }
      }
      
      if (!selectedAssistant) {
        throw new Error("Assistente não encontrado");
      }
      
      console.log("Selected assistant for campaign:", selectedAssistant);
      
      localStorage.setItem('selected_assistant', JSON.stringify(selectedAssistant));
      
      const assistantId = selectedAssistant.assistant_id || selectedAssistant.id;
      console.log("Using assistant ID for campaign:", assistantId);
      
      await fetchClientsForGroup(campaign.clientGroup);
      
      if (selectedGroupClients.length === 0) {
        throw new Error("Nenhum cliente encontrado neste grupo");
      }
      
      await campaignService.updateCampaign(campaign.id, {
        status: 'active',
        start_date: new Date().toISOString(),
      });
      
      for (const client of selectedGroupClients) {
        const webhookData = {
          action: 'make_call',
          campaign_id: campaign.id,
          client_name: client.name,
          client_phone: client.phone,
          client_id: client.id,
          call: {
            model: selectedAssistant.model || "gpt-4o-turbo",
            voice: selectedAssistant.voice || "33B4UnXyTNbgLmdEDh5P",
            language: "pt-BR"
          },
          additional_data: {
            assistant_id: assistantId,
            source: 'campaign_control',
            assistant_name: selectedAssistant.name,
            first_message: selectedAssistant.first_message || "Olá, como posso ajudar?",
            system_prompt: selectedAssistant.system_prompt || "",
            model_name: selectedAssistant.model || "gpt-4o-turbo"
          }
        };
        
        console.log(`Enviando webhook para cliente ${client.name}:`, webhookData);
        
        await webhookService.triggerCallWebhook(webhookData);
      }
      
      toast({
        title: "Campanha Iniciada",
        description: `A campanha "${campaign.name}" foi iniciada com sucesso para ${selectedGroupClients.length} clientes usando o assistente "${selectedAssistant.name}".`,
      });
      
      await refetchCampaigns();
    } catch (error) {
      console.error("Erro ao iniciar campanha:", error);
      toast({
        title: "Erro ao Iniciar Campanha",
        description: error.message || "Houve um problema ao iniciar sua campanha. Por favor, tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsActionLoading(prev => ({ ...prev, [campaign.id]: false }));
    }
  };

  const handlePauseCampaign = async (campaign) => {
    setIsActionLoading(prev => ({ ...prev, [campaign.id]: true }));
    try {
      await campaignService.updateCampaign(campaign.id, {
        status: 'paused',
      });
      
      toast({
        title: "Campanha Pausada",
        description: `A campanha "${campaign.name}" foi pausada com sucesso.`,
      });
      
      await refetchCampaigns();
    } catch (error) {
      console.error("Erro ao pausar campanha:", error);
      toast({
        title: "Erro ao Pausar Campanha",
        description: "Houve um problema ao pausar sua campanha. Por favor, tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsActionLoading(prev => ({ ...prev, [campaign.id]: false }));
    }
  };

  const handleStopCampaign = async (campaign) => {
    setIsActionLoading(prev => ({ ...prev, [campaign.id]: true }));
    try {
      await campaignService.updateCampaign(campaign.id, {
        status: 'completed',
        end_date: new Date().toISOString(),
      });
      
      toast({
        title: "Campanha Encerrada",
        description: `A campanha "${campaign.name}" foi encerrada com sucesso.`,
      });
      
      await refetchCampaigns();
    } catch (error) {
      console.error("Erro ao encerrar campanha:", error);
      toast({
        title: "Erro ao Encerrar Campanha",
        description: "Houve um problema ao encerrar sua campanha. Por favor, tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsActionLoading(prev => ({ ...prev, [campaign.id]: false }));
    }
  };

  const handleDeleteCampaign = async (campaign) => {
    setIsActionLoading(prev => ({ ...prev, [campaign.id]: true }));
    try {
      await campaignService.deleteCampaign(campaign.id);
      
      toast({
        title: "Campanha Excluída",
        description: `A campanha "${campaign.name}" foi excluída com sucesso.`,
      });
      
      await refetchCampaigns();
    } catch (error) {
      console.error("Erro ao excluir campanha:", error);
      toast({
        title: "Erro ao Excluir Campanha",
        description: "Houve um problema ao excluir sua campanha. Por favor, tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsActionLoading(prev => ({ ...prev, [campaign.id]: false }));
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-7xl">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">Suas Campanhas</h2>
            <Button size="sm" onClick={() => {
              refetchAssistants();
              toast({
                title: "Assistentes Atualizados",
                description: "Lista de assistentes foi atualizada com sucesso."
              });
            }}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar Assistentes
            </Button>
          </div>

          {isLoading ? (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <div className="text-center">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  <p className="text-muted-foreground mt-4">Carregando campanhas...</p>
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
                          Iniciada: {campaign.startDate} · {
                            userClientGroups.find(g => g.id.toString() === campaign.clientGroup)?.name || 'Grupo de Clientes'
                          } ({campaign.clientCount} clientes)
                        </CardDescription>
                      </div>
                      <div className={`px-2 py-1 rounded text-xs uppercase font-semibold text-white ${getStatusColor(campaign.status)}`}>
                        {campaign.status}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex flex-wrap gap-2 pt-2">
                        {campaign.status === 'draft' && (
                          <>
                            <Button 
                              variant="default" 
                              size="sm" 
                              className="bg-green-600 hover:bg-green-700"
                              onClick={() => handleStartCampaign(campaign)}
                              disabled={isActionLoading[campaign.id]}
                            >
                              {isActionLoading[campaign.id] ? (
                                <>
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  Iniciando...
                                </>
                              ) : (
                                <>
                                  <Play className="h-4 w-4 mr-2" />
                                  Iniciar
                                </>
                              )}
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="border-red-300 hover:bg-red-50 text-red-600"
                              onClick={() => handleDeleteCampaign(campaign)}
                              disabled={isActionLoading[campaign.id]}
                            >
                              {isActionLoading[campaign.id] ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4 mr-2" />
                              )}
                              Excluir
                            </Button>
                          </>
                        )}
                        
                        {campaign.status === 'active' && (
                          <>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handlePauseCampaign(campaign)}
                              disabled={isActionLoading[campaign.id]}
                            >
                              {isActionLoading[campaign.id] ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              ) : (
                                <PauseCircle className="h-4 w-4 mr-2" />
                              )}
                              Pausar
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="border-red-300 hover:bg-red-50"
                              onClick={() => handleStopCampaign(campaign)}
                              disabled={isActionLoading[campaign.id]}
                            >
                              {isActionLoading[campaign.id] ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              ) : (
                                <StopCircle className="h-4 w-4 mr-2 text-red-500" />
                              )}
                              Encerrar
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="border-red-300 hover:bg-red-50 text-red-600"
                              onClick={() => handleDeleteCampaign(campaign)}
                              disabled={isActionLoading[campaign.id]}
                            >
                              {isActionLoading[campaign.id] ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4 mr-2" />
                              )}
                              Excluir
                            </Button>
                          </>
                        )}
                        
                        {campaign.status === 'paused' && (
                          <>
                            <Button 
                              variant="default" 
                              size="sm" 
                              className="bg-green-600 hover:bg-green-700"
                              onClick={() => handleStartCampaign(campaign)}
                              disabled={isActionLoading[campaign.id]}
                            >
                              {isActionLoading[campaign.id] ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              ) : (
                                <Play className="h-4 w-4 mr-2" />
                              )}
                              Continuar
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="border-red-300 hover:bg-red-50"
                              onClick={() => handleStopCampaign(campaign)}
                              disabled={isActionLoading[campaign.id]}
                            >
                              {isActionLoading[campaign.id] ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              ) : (
                                <StopCircle className="h-4 w-4 mr-2 text-red-500" />
                              )}
                              Encerrar
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="border-red-300 hover:bg-red-50 text-red-600"
                              onClick={() => handleDeleteCampaign(campaign)}
                              disabled={isActionLoading[campaign.id]}
                            >
                              {isActionLoading[campaign.id] ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4 mr-2" />
                              )}
                              Excluir
                            </Button>
                          </>
                        )}
                        
                        {(campaign.status === 'completed' || campaign.status === 'error') && (
                          <>
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="border-red-300 hover:bg-red-50 text-red-600"
                              onClick={() => handleDeleteCampaign(campaign)}
                              disabled={isActionLoading[campaign.id]}
                            >
                              {isActionLoading[campaign.id] ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4 mr-2" />
                              )}
                              Excluir
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <div className="rounded-full bg-muted p-3 mb-4">
                  <Calendar className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Nenhuma Campanha</h3>
                <p className="text-muted-foreground text-center mb-4">
                  Crie sua primeira campanha para começar a alcançar seus clientes.
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
                  <Label htmlFor="name">Nome da Campanha</Label>
                  <Input
                    id="name"
                    placeholder="Promoção de Verão 2023"
                    value={newCampaign.name}
                    onChange={(e) => setNewCampaign({ ...newCampaign, name: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="clientGroup">Selecionar Grupo de Clientes</Label>
                  <Select
                    value={newCampaign.clientGroup}
                    onValueChange={(value) => setNewCampaign({ ...newCampaign, clientGroup: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um grupo de clientes" />
                    </SelectTrigger>
                    <SelectContent>
                      {isLoadingGroups ? (
                        <SelectItem value="loading" disabled>Carregando grupos de clientes...</SelectItem>
                      ) : userClientGroups.length === 0 ? (
                        <SelectItem value="no-groups" disabled>Nenhum grupo de clientes disponível</SelectItem>
                      ) : (
                        userClientGroups.map((group) => (
                          <SelectItem key={group.id} value={group.id.toString()}>
                            {group.name} ({group.client_count || 0} clientes)
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="aiProfile">Selecionar Assistente de IA</Label>
                  <Select
                    value={newCampaign.aiProfile}
                    onValueChange={(value) => setNewCampaign({ ...newCampaign, aiProfile: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um assistente de IA" />
                    </SelectTrigger>
                    <SelectContent>
                      {isLoadingAssistants ? (
                        <SelectItem value="loading" disabled>Carregando assistentes...</SelectItem>
                      ) : assistants.length === 0 ? (
                        <SelectItem value="no-assistants" disabled>
                          Nenhum assistente disponível - crie um na seção de Treinamento
                        </SelectItem>
                      ) : (
                        assistants.map((assistant) => (
                          <SelectItem key={assistant.id} value={assistant.id.toString()}>
                            {assistant.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  {assistants.length === 0 && (
                    <div className="p-2 bg-amber-50 text-amber-800 rounded text-xs mt-1">
                      Você precisa criar um assistente na seção de Treinamento de IA antes de criar uma campanha.
                    </div>
                  )}
                </div>

                <div className="pt-4">
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={assistants.length === 0 || isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Criando Campanha...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Criar Campanha
                      </>
                    )}
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
