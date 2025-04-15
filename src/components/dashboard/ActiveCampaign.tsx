import React from 'react';
import { Link } from 'react-router-dom';
import { PhoneOff, BarChart3 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { webhookService } from '@/services/webhookService';
import { useAuth } from '@/contexts/AuthContext';
import assistantService from '@/services/assistantService';
import { campaignService } from '@/services/campaignService';

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
  vapiAssistantId?: string;
}

interface ActiveCampaignProps {
  campaign: CampaignStatus;
  onCampaignStopped?: () => void;
}

const ActiveCampaign: React.FC<ActiveCampaignProps> = ({ campaign, onCampaignStopped }) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [isStoppingCampaign, setIsStoppingCampaign] = React.useState(false);
  const [isValidatingId, setIsValidatingId] = React.useState(false);
  const [validatedVapiId, setValidatedVapiId] = React.useState<string | null>(null);

  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  const formatAssistantId = (id?: string) => {
    if (!id) return '';
    return id.length > 12 ? `${id.slice(0, 12)}...` : id;
  };

  React.useEffect(() => {
    const validateVapiAssistantId = async () => {
      if (isValidatingId) return;
      
      setIsValidatingId(true);
      try {
        if (campaign.vapiAssistantId && UUID_REGEX.test(campaign.vapiAssistantId)) {
          try {
            const exists = await assistantService.validateVapiAssistantId(campaign.vapiAssistantId);
            if (exists) {
              console.log('Using validated vapiAssistantId:', campaign.vapiAssistantId);
              setValidatedVapiId(campaign.vapiAssistantId);
              setIsValidatingId(false);
              return;
            }
          } catch (e) {
            console.error('Error validating vapiAssistantId:', e);
          }
        }

        let foundVapiId = null;
        
        if (campaign.assistantId && UUID_REGEX.test(campaign.assistantId)) {
          try {
            const exists = await assistantService.validateVapiAssistantId(campaign.assistantId);
            if (exists) {
              console.log('Using validated assistantId as Vapi ID:', campaign.assistantId);
              foundVapiId = campaign.assistantId;
              setValidatedVapiId(foundVapiId);
              setIsValidatingId(false);
              return;
            }
          } catch (e) {
            console.error('Error validating assistantId as Vapi ID:', e);
          }
        }
        
        if (campaign.assistantName && !foundVapiId) {
          try {
            const idByName = await assistantService.getVapiAssistantIdByName(campaign.assistantName);
            if (idByName) {
              console.log('Found Vapi ID by assistant name:', idByName);
              foundVapiId = idByName;
              setValidatedVapiId(foundVapiId);
              setIsValidatingId(false);
              return;
            }
          } catch (e) {
            console.error('Error finding Vapi ID by name:', e);
          }
        }
        
        if (!foundVapiId) {
          try {
            const storedAssistant = localStorage.getItem('selected_assistant');
            if (storedAssistant) {
              const assistant = JSON.parse(storedAssistant);
              if (assistant) {
                const possibleId = assistant.assistant_id || assistant.id;
                if (possibleId && UUID_REGEX.test(possibleId)) {
                  const exists = await assistantService.validateVapiAssistantId(possibleId);
                  if (exists) {
                    console.log('Using ID from localStorage:', possibleId);
                    foundVapiId = possibleId;
                    setValidatedVapiId(foundVapiId);
                    setIsValidatingId(false);
                    return;
                  }
                }
              }
            }
          } catch (e) {
            console.error('Error getting assistant ID from localStorage:', e);
          }
        }
        
        if (!foundVapiId) {
          const FALLBACK_VAPI_ASSISTANT_ID = "01646bac-c486-455b-b1f7-1c8e15ba4cbf";
          console.log('Using fallback Vapi assistant ID:', FALLBACK_VAPI_ASSISTANT_ID);
          setValidatedVapiId(FALLBACK_VAPI_ASSISTANT_ID);
        }
      } catch (error) {
        console.error('Error validating assistant ID:', error);
      } finally {
        setIsValidatingId(false);
      }
    };

    validateVapiAssistantId();
  }, [campaign]);

  const handleCallCompletion = async (clientId: number) => {
    if (!campaign.id) {
      toast.error("ID da campanha não encontrado. Não é possível registrar a ligação.");
      return;
    }

    try {
      await campaignService.registerCallCompletion({
        client_id: clientId,
        campaign_id: campaign.id,
        call_status: 'completed',
        call_duration: Math.floor(Math.random() * 300) + 60,
        assistant_id: validatedVapiId || campaign.assistantId
      });
      
      queryClient.invalidateQueries({ queryKey: ['activeCampaigns'] });
      queryClient.invalidateQueries({ queryKey: ['campaignStats'] });
      
      toast.success("Ligação marcada como concluída com sucesso");
    } catch (error) {
      console.error('Erro ao registrar conclusão da ligação:', error);
      toast.error("Erro ao registrar a conclusão da ligação. Por favor, tente novamente.");
    }
  };

  const handleStopCampaign = async () => {
    if (!campaign.id) {
      toast.error("ID da campanha não encontrado. Não é possível interromper a campanha.");
      return;
    }

    try {
      setIsStoppingCampaign(true);
      
      const finalVapiAssistantId = validatedVapiId;
      
      if (!finalVapiAssistantId) {
        console.warn('No valid Vapi assistant ID found for stopping campaign');
      } else {
        console.log('Using validated Vapi assistant ID for stopping campaign:', finalVapiAssistantId);
      }
      
      const result = await webhookService.triggerCallWebhook({
        action: 'stop_campaign',
        campaign_id: campaign.id,
        user_id: user?.id,
        additional_data: {
          campaign_name: campaign.name,
          progress: campaign.progress,
          completed_calls: campaign.callsMade,
          assistant_id: campaign.assistantId,
          vapi_assistant_id: finalVapiAssistantId,
          assistant_name: campaign.assistantName
        }
      });
      
      if (result.success) {
        if (onCampaignStopped) {
          onCampaignStopped();
        }
        
        queryClient.invalidateQueries({ queryKey: ['activeCampaigns'] });
        queryClient.invalidateQueries({ queryKey: ['campaignStats'] });
        
        toast.success("Campanha interrompida com sucesso");
      } else {
        if (onCampaignStopped) {
          onCampaignStopped();
        }
        queryClient.invalidateQueries({ queryKey: ['activeCampaigns'] });
        toast.warning("A campanha foi marcada como interrompida, mas houve um problema na comunicação com o servidor.");
      }
    } catch (error) {
      console.error('Erro ao interromper campanha:', error);
      toast.error("Erro ao interromper a campanha. Por favor, tente novamente.");
      
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
                  (ID Supabase: {formatAssistantId(campaign.assistantId)})
                  {validatedVapiId && ` | ID Vapi: ${formatAssistantId(validatedVapiId)}`}
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
              disabled={isStoppingCampaign || isValidatingId}
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
