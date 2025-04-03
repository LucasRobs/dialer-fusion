import React, { useState, useEffect } from 'react';
import {
  PauseCircle,
  StopCircle,
  PlayCircle,
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
  const [isProcessingAction, setIsProcessingAction] = useState(false);
  const [newCampaign, setNewCampaign] = useState({
    name: '',
    clientGroup: '',
    aiProfile: '',
  });

  const fetchGroupClients = async (groupId: string) => {
    try {
      const { data, error } = await supabase
        .from('client_group_members')
        .select('client:clients(name, phone)')
        .eq('group_id', groupId);

      if (error) throw error;
      return data?.map(item => item.client) || [];
    } catch (error) {
      console.error('Erro ao buscar clientes do grupo:', error);
      return [];
    }
  };

  // Buscar grupos de clientes e contar os clientes em cada grupo
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

  // Fetch campaigns
  const { data: supabaseCampaignsData, refetch: refetchCampaigns } = useQuery({
    queryKey: ['campaigns'],
    queryFn: async () => await campaignService.getCampaigns(),
    staleTime: 0,
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
        clientGroup: campaign.client_group_id || '',
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

  const handleCampaignAction = async (action: string, campaignId: number) => {
    setIsProcessingAction(true);
    try {
      let newStatus = '';
      let successMessage = '';

      switch (action) {
        case 'start':
          newStatus = 'active';
          successMessage = 'Campanha iniciada com sucesso!';
          break;
        case 'pause':
          newStatus = 'paused';
          successMessage = 'Campanha pausada com sucesso!';
          break;
        case 'stop':
          newStatus = 'completed';
          successMessage = 'Campanha finalizada com sucesso!';
          break;
        case 'delete':
          await campaignService.deleteCampaign(campaignId);
          successMessage = 'Campanha excluída com sucesso!';
          break;
        default:
          throw new Error('Ação inválida');
      }

      if (action !== 'delete') {
        await campaignService.updateCampaign(campaignId, { status: newStatus });
      }

      toast({
        title: 'Sucesso',
        description: successMessage,
      });

      await refetchCampaigns();
    } catch (error) {
      console.error(`Erro ao ${action} campanha:`, error);
      toast({
        title: 'Erro',
        description: `Houve um problema ao ${action} a campanha. Por favor, tente novamente.`,
        variant: 'destructive',
      });
    } finally {
      setIsProcessingAction(false);
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-7xl">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">Suas Campanhas</h2>
            <Button size="sm" onClick={() => refetchCampaigns()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar
            </Button>
          </div>

          {isLoading ? (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                <p className="text-muted-foreground mt-4">Carregando campanhas...</p>
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
                          {campaign.completedCalls} de {campaign.clientCount} chamadas concluídas
                        </CardDescription>
                      </div>
                      <div className="flex gap-2">
                        {campaign.status !== 'active' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleCampaignAction('start', campaign.id)}
                            disabled={isProcessingAction}
                          >
                            <PlayCircle className="h-4 w-4 mr-1" />
                            Iniciar
                          </Button>
                        )}
                        {campaign.status === 'active' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleCampaignAction('pause', campaign.id)}
                            disabled={isProcessingAction}
                          >
                            <PauseCircle className="h-4 w-4 mr-1" />
                            Pausar
                          </Button>
                        )}
                        {campaign.status !== 'completed' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleCampaignAction('stop', campaign.id)}
                            disabled={isProcessingAction}
                          >
                            <StopCircle className="h-4 w-4 mr-1" />
                            Parar
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleCampaignAction('delete', campaign.id)}
                          disabled={isProcessingAction}
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Excluir
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between mb-1 text-sm">
                          <span>Progresso</span>
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
                <p className="text-muted-foreground">Nenhuma campanha encontrada.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default CampaignControls;