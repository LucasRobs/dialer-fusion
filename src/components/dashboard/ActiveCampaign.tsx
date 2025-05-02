
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
  vapiAssistantId?: string;  // Explicit field for Vapi assistant ID
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

  // UUID validation regex
  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  const formatAssistantId = (id?: string) => {
    if (!id) return '';
    // Format the ID to show just the first part like in the screenshot
    return id.length > 12 ? `${id.slice(0, 12)}...` : id;
  };

  // Validate and get proper assistant ID when component loads
  React.useEffect(() => {
    const validateVapiAssistantId = async () => {
      if (isValidatingId) return;
      
      setIsValidatingId(true);
      try {
        // First try the explicit Vapi assistant ID if available
        if (campaign.vapiAssistantId && UUID_REGEX.test(campaign.vapiAssistantId)) {
          try {
            // Verify this ID exists in Vapi
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

        // Try other approaches
        let foundVapiId = null;
        
        // Check if assistantId is a valid UUID and try it directly
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
        
        // Get Vapi ID from assistant name
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
        
        // Try to get from local storage
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
        
        // Use fallback ID as last resort
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

  const handleStopCampaign = async () => {
    if (!campaign.id) {
      toast.error("ID da campanha não encontrado. Não é possível interromper a campanha.");
      return;
    }

    try {
      setIsStoppingCampaign(true);
      
      // Use the validated Vapi assistant ID
      const finalVapiAssistantId = validatedVapiId;
      
      if (!finalVapiAssistantId) {
        console.warn('No valid Vapi assistant ID found for stopping campaign');
      } else {
        console.log('Using validated Vapi assistant ID for stopping campaign:', finalVapiAssistantId);
      }
      
      // Send data to webhook with the IDs
      const result = await webhookService.triggerCallWebhook({
        action: 'stop_campaign',
        campaign_id: campaign.id,
        user_id: user?.id || '',
        timestamp: new Date().toISOString(),
        assistant_id: finalVapiAssistantId || '',
        assistant_name: campaign.assistantName || '',
        additional_data: {
          campaign_name: campaign.name,
          progress: campaign.progress,
          completed_calls: campaign.callsMade,
          assistant_id: campaign.assistantId, // Supabase ID
          vapi_assistant_id: finalVapiAssistantId, // Validated Vapi API ID
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
