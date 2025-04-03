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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { campaignService } from '@/services/campaignService';
import { useAuth } from '@/contexts/AuthContext';

const getStatusColor = (status: string): string => {
  switch (status) {
    case 'active':
      return 'bg-green-500';
    case 'paused':
      return 'bg-yellow-500';
    case 'stopped':
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
        clientCount: campaign.total_calls || 0,
        completedCalls: campaign.answered_calls || 0,
      }));

      setCampaigns(formattedCampaigns);
      setIsLoading(false);
    }
  }, [supabaseCampaignsData]);

  const handleStartCampaign = async (id: number) => {
    try {
      await campaignService.updateCampaign(id, { status: 'active' });
      toast({ title: 'Campanha Iniciada', description: 'A campanha foi iniciada com sucesso.' });
      refetchCampaigns();
    } catch (error) {
      console.error('Erro ao iniciar campanha:', error);
      toast({ title: 'Erro', description: 'Não foi possível iniciar a campanha.', variant: 'destructive' });
    }
  };

  const handlePauseCampaign = async (id: number) => {
    try {
      await campaignService.updateCampaign(id, { status: 'paused' });
      toast({ title: 'Campanha Pausada', description: 'A campanha foi pausada com sucesso.' });
      refetchCampaigns();
    } catch (error) {
      console.error('Erro ao pausar campanha:', error);
      toast({ title: 'Erro', description: 'Não foi possível pausar a campanha.', variant: 'destructive' });
    }
  };

  const handleStopCampaign = async (id: number) => {
    try {
      await campaignService.updateCampaign(id, { status: 'stopped' });
      toast({ title: 'Campanha Parada', description: 'A campanha foi parada com sucesso.' });
      refetchCampaigns();
    } catch (error) {
      console.error('Erro ao parar campanha:', error);
      toast({ title: 'Erro', description: 'Não foi possível parar a campanha.', variant: 'destructive' });
    }
  };

  const handleDeleteCampaign = async (id: number) => {
    try {
      await campaignService.deleteCampaign(id);
      toast({ title: 'Campanha Deletada', description: 'A campanha foi deletada com sucesso.' });
      refetchCampaigns();
    } catch (error) {
      console.error('Erro ao deletar campanha:', error);
      toast({ title: 'Erro', description: 'Não foi possível deletar a campanha.', variant: 'destructive' });
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-7xl">
      <div className="flex justify-between items-center mb-6">
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
                      <Button size="sm" variant="outline" onClick={() => handleStartCampaign(campaign.id)}>
                        <PlayCircle className="h-4 w-4 mr-1" />
                        Iniciar
                      </Button>
                    )}
                    {campaign.status === 'active' && (
                      <Button size="sm" variant="outline" onClick={() => handlePauseCampaign(campaign.id)}>
                        <PauseCircle className="h-4 w-4 mr-1" />
                        Pausar
                      </Button>
                    )}
                    {campaign.status !== 'stopped' && (
                      <Button size="sm" variant="outline" onClick={() => handleStopCampaign(campaign.id)}>
                        <StopCircle className="h-4 w-4 mr-1" />
                        Parar
                      </Button>
                    )}
                    <Button size="sm" variant="destructive" onClick={() => handleDeleteCampaign(campaign.id)}>
                      <Trash2 className="h-4 w-4 mr-1" />
                      Deletar
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
  );
};

export default CampaignControls;