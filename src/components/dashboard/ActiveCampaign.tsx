import React from 'react';
import { Link } from 'react-router-dom';
import { PhoneOff, BarChart3, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { webhookService } from '@/services/webhookService';
import { useAuth } from '@/contexts/AuthContext';

interface CampaignStatus {
  id: number;
  name: string;
  progress: number;
  startTime: string;
  callsMade: number;
  callsRemaining: number;
  active: boolean;
  assistantName?: string;
  assistantId?: string;
  vapiAssistantId?: string;  // Added explicit field for Vapi assistant ID
}

interface ActiveCampaignProps {
  campaign: CampaignStatus;
  onCampaignStopped?: () => void;
}

const ActiveCampaign: React.FC<ActiveCampaignProps> = ({ campaign, onCampaignStopped }) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [isStoppingCampaign, setIsStoppingCampaign] = React.useState(false);

  const handleStopCampaign = async () => {
    if (!campaign.id) {
      toast.error("ID da campanha não encontrado. Não é possível interromper a campanha.");
      return;
    }

    try {
      setIsStoppingCampaign(true);
      
      // Get assistant ID for Vapi (preferring the explicit vapiAssistantId if available)
      let vapiAssistantId = campaign.vapiAssistantId || campaign.assistantId;
      let supabaseAssistantId = campaign.assistantId;
      
      if (!vapiAssistantId) {
        // Try to get from localStorage as fallback
        try {
          const storedAssistant = localStorage.getItem('selected_assistant');
          if (storedAssistant) {
            const parsedAssistant = JSON.parse(storedAssistant);
            // For Vapi, we need the assistant_id field specifically
            vapiAssistantId = parsedAssistant.assistant_id || parsedAssistant.id;
            supabaseAssistantId = parsedAssistant.id; // Keep Supabase ID separate
            console.log('Using assistant from localStorage:', {
              vapiAssistantId,
              supabaseAssistantId,
              parsedAssistant
            });
          }
        } catch (e) {
          console.error('Error parsing stored assistant data:', e);
        }
      }

      console.log('Stopping campaign with assistant IDs:', { 
        vapiAssistantId, 
        supabaseAssistantId 
      });
      
      // Send data to webhook with both IDs
      const result = await webhookService.triggerCallWebhook({
        action: 'stop_campaign',
        campaign_id: campaign.id,
        user_id: user?.id,
        additional_data: {
          campaign_name: campaign.name,
          progress: campaign.progress,
          completed_calls: campaign.callsMade,
          assistant_id: vapiAssistantId, // This should be the Vapi assistant ID
          supabase_assistant_id: supabaseAssistantId, // Also send Supabase ID for reference
          assistant_name: campaign.assistantName
        }
      });
      
      if (result.success) {
        if (onCampaignStopped) {
          onCampaignStopped();
        }
        
        // Invalidate queries to force data reload
        queryClient.invalidateQueries({ queryKey: ['activeCampaigns'] });
        queryClient.invalidateQueries({ queryKey: ['campaignStats'] });
        
        toast.success("Campanha interrompida com sucesso");
      } else {
        // Even if the webhook call fails, we still want to allow the user to stop the campaign
        // since we already showed an error message in the webhook service
        if (onCampaignStopped) {
          onCampaignStopped();
        }
        queryClient.invalidateQueries({ queryKey: ['activeCampaigns'] });
        toast.warning("A campanha foi marcada como interrompida, mas houve um problema na comunicação com o servidor.");
      }
    } catch (error) {
      console.error('Erro ao interromper campanha:', error);
      toast.error("Erro ao interromper a campanha. Por favor, tente novamente.");
      
      // Even on error, allow the campaign to be stopped in the UI
      if (onCampaignStopped) {
        onCampaignStopped();
      }
    } finally {
      setIsStoppingCampaign(false);
    }
  };

  return (
    <Card className="mb-8 border-2 border-secondary/30 shadow-md">
      <CardHeader className="pb-2 bg-secondary/5">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl flex items-center">
              <div className="h-3 w-3 rounded-full bg-secondary animate-pulse mr-2"></div>
              Campanha Ativa: {campaign.name}
            </CardTitle>
            <p className="text-sm text-foreground/70">
              Iniciada às {campaign.startTime} • Assistente: {campaign.assistantName || 'N/A'}
              {campaign.assistantId && (
                <span className="text-xs text-muted-foreground ml-1">
                  (ID Supabase: {campaign.assistantId.slice(0, 8)}...)
                  {campaign.vapiAssistantId && ` | ID Vapi: ${campaign.vapiAssistantId.slice(0, 8)}...`}
                </span>
              )}
            </p>
          </div>
          <div className="flex gap-2">
            <Button 
              size="sm" 
              variant="outline" 
              className="flex items-center gap-1"
              onClick={handleStopCampaign}
              disabled={isStoppingCampaign}
            >
              {isStoppingCampaign ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-foreground" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Interrompendo...</span>
                </>
              ) : (
                <>
                  <PhoneOff size={16} />
                  <span>Interromper Campanha</span>
                </>
              )}
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
      <CardContent className="pt-4">
        <div className="w-full h-3 bg-gray-200 rounded-full mt-2">
          <div 
            className="h-full bg-secondary rounded-full transition-all duration-500 ease-in-out"
            style={{ width: `${campaign.progress}%` }}
          ></div>
        </div>
        <div className="flex justify-between mt-3 text-sm text-foreground/70">
          <span className="font-medium">{campaign.callsMade} ligações realizadas</span>
          <span className="font-medium">{campaign.callsRemaining} ligações restantes</span>
        </div>
      </CardContent>
    </Card>
  );
};

export default ActiveCampaign;
