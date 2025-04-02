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
import WorkflowStatus from '@/components/WorkflowStatus';
import { webhookService } from '@/services/webhookService';
import { campaignService } from '@/services/campaignService';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://wwzlfjoiuoocbatfizac.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind3emxmam9pdW9vY2JhdGZpemFjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMzNTY5ODEsImV4cCI6MjA1ODkzMjk4MX0.D10AhJ4BeF4vWtH--RYM7WKwePOlZOhEX2tRF0hTfHU';

export const supabase = createClient(supabaseUrl, supabaseKey);

import assistantService from '@/services/assistantService';
import { useAuth } from '@/contexts/AuthContext';
import { clientGroupService } from '@/services/clientGroupService';

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
  const [newCampaign, setNewCampaign] = useState({
    name: '',
    clientGroup: '',
    aiProfile: '',
  });

  // Fetch campaigns
  const { data: supabaseCampaignsData, refetch: refetchCampaigns } = useQuery({
    queryKey: ['campaigns'],
    queryFn: async () => await campaignService.getCampaigns(),
    staleTime: 0,
  });

  // Fetch assistants
  const { data: customAssistants = [], isLoading: isLoadingAssistants, refetch: refetchAssistants } = useQuery({
    queryKey: ['assistants', user?.id],
    queryFn: () => assistantService.getAllAssistants(user?.id),
    enabled: !!user?.id,
    staleTime: 0,
  });

  // Map assistants to AI profiles
  const { data: aiProfiles = [] } = useQuery({
    queryKey: ['aiProfiles', customAssistants.length],
    queryFn: () => {
      const readyAssistants = customAssistants.filter(
        (assistant) =>
          (assistant.status === 'ready' || !assistant.status) &&
          (assistant.user_id === user?.id || !assistant.user_id)
      );

      return readyAssistants.map((assistant) => ({
        id: assistant.id,
        name: assistant.name,
        assistant_id: assistant.assistant_id,
        description: `Assistente criado em ${
          assistant.created_at ? new Date(assistant.created_at).toLocaleDateString() : 'data desconhecida'
        }`,
      }));
    },
    enabled: customAssistants.length > 0,
    staleTime: 0,
  });

  // Fetch client groups
  const { data: userClientGroups = [], isLoading: isLoadingGroups } = useQuery({
    queryKey: ['userClientGroups', user?.id],
    queryFn: async () => {
      try {
        const groups = await clientGroupService.getClientGroups();
        const { count: totalCount } = await supabase
          .from('clients')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user?.id);

        return [
          { id: 'all', name: 'All Clients', client_count: totalCount || 0 },
          ...groups,
        ];
      } catch (error) {
        console.error('Error fetching user client groups:', error);
        return [{ id: 'all', name: 'All Clients', client_count: 0 }];
      }
    },
    enabled: !!user?.id,
  });

  useEffect(() => {
    if (supabaseCampaignsData) {
      const formattedCampaigns = supabaseCampaignsData.map((campaign) => ({
        id: campaign.id,
        name: campaign.name || 'Untitled Campaign',
        status: campaign.status || 'draft',
        progress:
          campaign.total_calls > 0
            ? Math.round((campaign.answered_calls / campaign.total_calls) * 100)
            : 0,
        clientGroup: 'Active Clients',
        clientCount: campaign.total_calls || 0,
        completedCalls: campaign.answered_calls || 0,
        aiProfile: 'Sales Assistant',
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

    const selectedAssistantProfile = aiProfiles.find(
      (profile) => profile.id.toString() === newCampaign.aiProfile
    );

    if (!selectedAssistantProfile) {
      toast({
        title: 'Erro',
        description: 'Por favor, selecione um assistente de IA válido',
        variant: 'destructive',
      });
      return;
    }

    try {
      // Salvar o assistente selecionado no localStorage
      localStorage.setItem('selected_assistant', JSON.stringify(selectedAssistantProfile));
      console.log('Assistente selecionado para campanha:', selectedAssistantProfile);

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
      });

      toast({
        title: 'Campanha Criada',
        description: `Sua campanha "${newCampaign.name}" foi criada com o assistente "${selectedAssistantProfile.name}"`,
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

          <WorkflowStatus />

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
                          Iniciada: {campaign.startDate} · {campaign.clientGroup} ({campaign.clientCount} clientes)
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
                          <span>Progresso: {campaign.completedCalls} de {campaign.clientCount} chamadas concluídas</span>
                          <span>{campaign.progress}%</span>
                        </div>
                        <Progress value={campaign.progress} className="h-2" />
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
                      ) : aiProfiles.length === 0 ? (
                        <SelectItem value="no-assistants" disabled>
                          Nenhum assistente disponível - crie um na seção de Treinamento
                        </SelectItem>
                      ) : (
                        aiProfiles.map((profile) => (
                          <SelectItem key={profile.id} value={profile.id.toString()}>
                            {profile.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  {aiProfiles.length === 0 && (
                    <div className="p-2 bg-amber-50 text-amber-800 rounded text-xs mt-1">
                      Você precisa criar um assistente na seção de Treinamento de IA antes de criar uma campanha.
                    </div>
                  )}
                </div>

                <div className="pt-4">
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={aiProfiles.length === 0 || isSubmitting}
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