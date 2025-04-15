import { supabase } from '@/lib/supabase';
import { campaignService } from '@/services/campaignService';

export const webhookService = {
  async triggerCallWebhook(data: any) {
    try {
      console.log('Disparando webhook com os dados:', data);

      // Registrar o webhook na tabela webhook_logs
      await supabase.from('webhook_logs').insert([{
        action: data.action,
        webhook_url: 'vapi',
        request_data: data,
        success: true
      }]);

      // Simular uma resposta de sucesso
      return {
        success: true,
        message: 'Webhook disparado com sucesso',
        data: data
      };
    } catch (error) {
      console.error('Erro ao disparar webhook:', error);

      // Registrar o erro no webhook_logs
      await supabase.from('webhook_logs').insert([{
        action: data.action,
        webhook_url: 'vapi',
        request_data: data,
        success: false,
        error_message: error.message
      }]);

      return {
        success: false,
        message: 'Erro ao disparar webhook',
        error: error.message
      };
    }
  },

  // Novo método para processar dados de chamada completada sem usar Deno
  async processCallCompletionFromN8N(data: {
    client_id: number;
    campaign_id: number;
    call_status?: string;
    call_duration?: number;
    call_start?: string;
    call_end?: string;
    call_summary?: string;
    recording_url?: string;
    assistant_id?: string;
  }) {
    try {
      console.log('Processando dados de chamada completada do n8n:', data);
      
      // 1. Atualizar status do cliente na campanha
      const { error: updateClientError } = await supabase
        .from('campaign_clients')
        .update({
          status: data.call_status || 'completed'
        })
        .match({
          campaign_id: data.campaign_id,
          client_id: data.client_id
        });

      if (updateClientError) {
        console.error('Erro ao atualizar cliente da campanha:', updateClientError);
        throw updateClientError;
      }

      // 2. Obter dados atuais da campanha
      const { data: campaignData, error: campaignError } = await supabase
        .from('campaigns')
        .select('*')
        .eq('id', data.campaign_id)
        .single();

      if (campaignError) {
        console.error('Erro ao buscar campanha:', campaignError);
        throw campaignError;
      }

      // 3. Calcular novas estatísticas
      const newAnsweredCalls = (campaignData.answered_calls || 0) + 1;
      
      let newAverageDuration = campaignData.average_duration || 0;
      if (data.call_duration) {
        const totalDurationBefore = (campaignData.average_duration || 0) * (campaignData.answered_calls || 0);
        const totalDurationAfter = totalDurationBefore + data.call_duration;
        newAverageDuration = Math.round(totalDurationAfter / newAnsweredCalls);
      }

      // 4. Atualizar campanha com novas estatísticas
      const { error: updateCampaignError } = await supabase
        .from('campaigns')
        .update({
          answered_calls: newAnsweredCalls,
          average_duration: newAverageDuration,
          updated_at: new Date().toISOString()
        })
        .eq('id', data.campaign_id);

      if (updateCampaignError) {
        console.error('Erro ao atualizar estatísticas da campanha:', updateCampaignError);
        throw updateCampaignError;
      }

      // 5. Verificar e criar ou atualizar o registro da chamada
      const { data: existingCall, error: checkCallError } = await supabase
        .from('calls')
        .select('id')
        .match({
          campaign_id: data.campaign_id,
          client_id: data.client_id
        })
        .maybeSingle();

      if (checkCallError) {
        console.error('Erro ao verificar chamada existente:', checkCallError);
        throw checkCallError;
      }

      if (!existingCall) {
        // 5.1 Criar novo registro de chamada
        const callData = {
          campaign_id: data.campaign_id,
          client_id: data.client_id,
          status: data.call_status || 'completed',
          call_start: data.call_start || new Date().toISOString(),
          call_end: data.call_end || new Date().toISOString(),
          duration: data.call_duration || 0,
          call_summary: data.call_summary || '',
          recording_url: data.recording_url || '',
          assistant_id: data.assistant_id || campaignData.assistant_id || null
        };

        const { error: insertCallError } = await supabase
          .from('calls')
          .insert([callData]);

        if (insertCallError) {
          console.error('Erro ao criar registro de chamada:', insertCallError);
          throw insertCallError;
        }
      } else if (data.call_duration || data.call_end || data.call_summary) {
        // 5.2 Atualizar registro de chamada existente
        const updateData: any = {};
        if (data.call_status) updateData.status = data.call_status;
        if (data.call_duration) updateData.duration = data.call_duration;
        if (data.call_end) updateData.call_end = data.call_end;
        if (data.call_summary) updateData.call_summary = data.call_summary;
        if (data.recording_url) updateData.recording_url = data.recording_url;
        
        const { error: updateCallError } = await supabase
          .from('calls')
          .update(updateData)
          .eq('id', existingCall.id);

        if (updateCallError) {
          console.error('Erro ao atualizar registro de chamada:', updateCallError);
          throw updateCallError;
        }
      }

      return {
        success: true,
        message: 'Dados de chamada processados com sucesso',
        campaign_id: data.campaign_id,
        client_id: data.client_id,
        answered_calls: newAnsweredCalls
      };
    } catch (error) {
      console.error('Erro ao processar dados de chamada:', error);
      throw error;
    }
  }
};
