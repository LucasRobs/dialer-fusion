
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { toast } from 'sonner';
import { Sparkles, Phone } from 'lucide-react';
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from 'react-router-dom';
import { webhookService, WebhookPayload } from "@/services/webhookService";

interface WorkflowStatusProps {
  clientId: number;
  phoneNumber: string;
  assistantId: string;
  onCallStarted: () => void;
}

const WorkflowStatus: React.FC<WorkflowStatusProps> = ({ clientId, phoneNumber, assistantId, onCallStarted }) => {
  const [isCalling, setIsCalling] = useState(false);
  const [callStatus, setCallStatus] = useState<string | null>(null);
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleStartCall = async () => {
    if (!user) {
      toast.error("Você precisa estar logado para iniciar uma ligação.");
      return;
    }

    setIsCalling(true);
    setCallStatus('Iniciando chamada...');

    try {
      const payload: WebhookPayload = {
        action: 'make_call',
        assistant_id: assistantId,
        assistant_name: 'Nome do Assistente', // Replace with actual assistant name
        timestamp: new Date().toISOString(),
        user_id: user.id,
        client_id: clientId,
        phone_number: phoneNumber,
        additional_data: {
          // Add any additional data you want to pass to the webhook
        },
      };

      await webhookService.triggerCallWebhook(payload);

      toast.success("Chamada iniciada com sucesso!");
      setCallStatus('Chamada em andamento...');
      onCallStarted();
    } catch (error: any) {
      console.error("Erro ao iniciar chamada:", error);
      toast.error(`Erro ao iniciar chamada: ${error.message || 'Erro desconhecido'}`);
      setCallStatus('Erro ao iniciar chamada.');
    } finally {
      setIsCalling(false);
    }
  };

  return (
    <div>
      {callStatus && (
        <div className="mb-4 p-3 rounded-md bg-gray-50 text-gray-700">
          {callStatus}
        </div>
      )}
      <Button
        onClick={handleStartCall}
        disabled={isCalling}
        className="w-full"
      >
        {isCalling ? (
          <>
            <Sparkles className="mr-2 h-4 w-4 animate-spin" />
            Iniciando Chamada...
          </>
        ) : (
          <>
            <Phone className="mr-2 h-4 w-4" />
            Iniciar Chamada
          </>
        )}
      </Button>
    </div>
  );
};

export default WorkflowStatus;
