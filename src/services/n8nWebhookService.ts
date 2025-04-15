
import { webhookService } from '@/services/webhookService';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export const n8nWebhookService = {
  // URL para integrar com n8n - deve ser incluída nas configurações do n8n
  getWebhookUrl() {
    // Retorna a URL do seu aplicativo + o path onde seu webhook será processado
    return `${window.location.origin}/api/webhook/call-completed`;
  },
  
  // Função que pode ser chamada a partir de um endpoint da sua aplicação
  async processWebhookData(data: any) {
    try {
      console.log('Dados recebidos do n8n:', data);
      
      if (!data.client_id || !data.campaign_id) {
        console.error('Dados obrigatórios faltando: client_id e campaign_id são necessários');
        return {
          success: false,
          error: 'Dados obrigatórios faltando: client_id e campaign_id são necessários'
        };
      }
      
      // Registrar o webhook na tabela webhook_logs (opcional, para manter histórico)
      await supabase.from('webhook_logs').insert([{
        action: 'call_completed',
        webhook_url: 'n8n',
        request_data: data,
        success: true
      }]);
      
      // Processar os dados usando o serviço de webhook
      const result = await webhookService.processCallCompletionFromN8N({
        client_id: data.client_id,
        campaign_id: data.campaign_id,
        call_status: data.call_status,
        call_duration: data.call_duration,
        call_start: data.call_start,
        call_end: data.call_end,
        call_summary: data.call_summary,
        recording_url: data.recording_url,
        assistant_id: data.assistant_id
      });
      
      // Notificar o usuário do sucesso (se estiver em um contexto de UI)
      toast.success("Dados de chamada processados com sucesso");
      
      return {
        success: true,
        message: 'Dados de chamada processados com sucesso',
        result
      };
    } catch (error) {
      console.error('Erro ao processar dados do webhook:', error);
      
      // Notificar o usuário do erro (se estiver em um contexto de UI)
      toast.error("Erro ao processar dados da chamada");
      
      return {
        success: false,
        error: error.message || 'Erro desconhecido'
      };
    }
  },
  
  // Esta função pode ser usada para testes ou chamadas manuais
  async simulateCallCompletion(clientId: number, campaignId: number, callDuration?: number) {
    try {
      const result = await webhookService.processCallCompletionFromN8N({
        client_id: clientId,
        campaign_id: campaignId,
        call_status: 'completed',
        call_duration: callDuration || Math.floor(Math.random() * 300) + 60
      });
      
      toast.success("Simulação de chamada completada com sucesso");
      return result;
    } catch (error) {
      console.error('Erro na simulação de chamada:', error);
      toast.error("Erro na simulação de chamada");
      throw error;
    }
  }
};
