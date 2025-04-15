
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
      
      // Atualizar a campanha incrementando o contador de chamadas respondidas
      const { data: campaignData, error: campaignError } = await supabase
        .from('campaigns')
        .select('answered_calls, total_calls')
        .eq('id', data.campaign_id)
        .single();
      
      if (campaignError) {
        console.error('Erro ao buscar dados da campanha:', campaignError);
        throw campaignError;
      }
      
      const updatedAnsweredCalls = (campaignData.answered_calls || 0) + 1;
      
      await supabase
        .from('campaigns')
        .update({ 
          answered_calls: updatedAnsweredCalls,
          average_duration: data.call_duration || 0
        })
        .eq('id', data.campaign_id);
      
      // Registrar a chamada na tabela de chamadas
      const { data: callData, error: callError } = await supabase
        .from('calls')
        .insert([{
          campaign_id: data.campaign_id,
          client_id: data.client_id,
          status: data.call_status || 'completed',
          duration: data.call_duration || 0,
          call_start: data.call_start || new Date().toISOString(),
          call_end: data.call_end || new Date().toISOString(),
          summary: data.call_summary || '',
          recording_url: data.recording_url || '',
          assistant_id: data.assistant_id || null
        }])
        .select()
        .single();
      
      if (callError) {
        console.error('Erro ao registrar chamada:', callError);
        throw callError;
      }
      
      // Notificar o usuário do sucesso (se estiver em um contexto de UI)
      toast.success("Dados de chamada processados com sucesso");
      
      return {
        success: true,
        message: 'Dados de chamada processados com sucesso',
        result: callData
      };
    } catch (error: any) {
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
      const result = await this.processWebhookData({
        client_id: clientId,
        campaign_id: campaignId,
        call_status: 'completed',
        call_duration: callDuration || Math.floor(Math.random() * 300) + 60,
        call_start: new Date().toISOString(),
        call_end: new Date().toISOString()
      });
      
      if (result.success) {
        toast.success("Simulação de chamada completada com sucesso");
      } else {
        toast.error(`Erro na simulação: ${result.error}`);
      }
      
      return result;
    } catch (error: any) {
      console.error('Erro na simulação de chamada:', error);
      toast.error("Erro na simulação de chamada");
      throw error;
    }
  }
};
