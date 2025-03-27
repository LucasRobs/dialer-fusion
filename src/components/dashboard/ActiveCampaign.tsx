
import React from 'react';
import { Link } from 'react-router-dom';
import { PhoneOff, BarChart3 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { webhookService } from '@/services/webhookService';

interface CampaignStatus {
  id: number;
  name: string;
  progress: number;
  startTime: string;
  callsMade: number;
  callsRemaining: number;
  active: boolean;
}

interface ActiveCampaignProps {
  campaign: CampaignStatus;
  onCampaignStopped?: () => void;
}

const ActiveCampaign: React.FC<ActiveCampaignProps> = ({ campaign, onCampaignStopped }) => {
  const queryClient = useQueryClient();

  const handleStopCampaign = async () => {
    if (!campaign.id) {
      toast.error("ID da campanha não encontrado. Não é possível interromper a campanha.");
      return;
    }

    try {
      // Enviar dados para webhook
      await webhookService.triggerCallWebhook({
        action: 'stop_campaign',
        campaign_id: campaign.id,
        additional_data: {
          campaign_name: campaign.name,
          progress: campaign.progress,
          completed_calls: campaign.callsMade
        }
      });
      
      if (onCampaignStopped) {
        onCampaignStopped();
      }
      
      // Invalidar as queries para forçar o recarregamento dos dados
      queryClient.invalidateQueries({ queryKey: ['activeCampaigns'] });
      queryClient.invalidateQueries({ queryKey: ['campaignStats'] });
      
      toast.success("Campanha interrompida com sucesso");
    } catch (error) {
      console.error('Erro ao interromper campanha:', error);
      toast.error("Erro ao interromper a campanha. Por favor, tente novamente.");
    }
  };

  return (
    <Card className="mb-8 border-l-4 border-l-secondary">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl flex items-center">
              <div className="h-3 w-3 rounded-full bg-secondary animate-pulse mr-2"></div>
              Campanha Ativa: {campaign.name}
            </CardTitle>
            <p className="text-sm text-foreground/70">Iniciada às {campaign.startTime}</p>
          </div>
          <div className="flex gap-2">
            <Button 
              size="sm" 
              variant="outline" 
              className="flex items-center gap-1"
              onClick={handleStopCampaign}
            >
              <PhoneOff size={16} />
              <span>Interromper Campanha</span>
            </Button>
            <Link to="/campaigns">
              <Button size="sm" className="flex items-center gap-1">
                <BarChart3 size={16} />
                <span>Ver Detalhes</span>
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
          <span>{campaign.callsMade} ligações realizadas</span>
          <span>{campaign.callsRemaining} ligações restantes</span>
        </div>
      </CardContent>
    </Card>
  );
};

export default ActiveCampaign;
