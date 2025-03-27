
import { supabase } from '@/integrations/supabase/client';

// URL do webhook para o serviço de ligações
const WEBHOOK_URL = 'https://primary-production-31de.up.railway.app/webhook-test/collowop';

// Interface para os dados do webhook
export interface WebhookData {
  action: string;
  campaign_id?: number;
  client_id?: number;
  client_name?: string;
  client_phone?: string;
  timestamp: string;
  user_id?: string;
  additional_data?: Record<string, any>;
}

// Serviço para gerenciar webhooks
export const webhookService = {
  // Função para disparar o webhook
  async triggerCallWebhook(data: Omit<WebhookData, 'timestamp'>) {
    console.log('Disparando webhook para ligação:', data);
    
    // Adiciona timestamp
    const webhookData: WebhookData = {
      ...data,
      timestamp: new Date().toISOString()
    };
    
    try {
      // Envia requisição para o webhook
      const response = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(webhookData),
      });
      
      // Registra a chamada no histórico
      await this.logWebhookCall(webhookData, response.ok);
      
      return { success: response.ok, status: response.status };
    } catch (error) {
      console.error('Erro ao disparar webhook:', error);
      await this.logWebhookCall(webhookData, false, error);
      return { success: false, error };
    }
  },
  
  // Função para registrar a chamada do webhook no histórico
  async logWebhookCall(data: WebhookData, success: boolean, error?: any) {
    try {
      const { data: logData, error: logError } = await supabase
        .from('webhook_logs')
        .insert([{
          webhook_url: WEBHOOK_URL,
          request_data: data,
          success,
          error_message: error ? String(error) : null,
          action: data.action
        }]);
        
      if (logError) {
        console.error('Erro ao registrar log do webhook:', logError);
      }
    } catch (err) {
      console.error('Erro ao registrar log do webhook:', err);
    }
  },
  
  // Função para buscar o histórico de chamadas webhook
  async getWebhookLogs(limit = 20) {
    const { data, error } = await supabase
      .from('webhook_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
      
    if (error) throw error;
    return data;
  },
  
  // Função para verificar o status das automações do n8n
  async getN8nWorkflowStatus(workflowId?: string) {
    try {
      // Esta é uma simulação - em produção, você precisaria integrar com a API do n8n
      // ou receber atualizações de status via webhook
      return {
        status: 'running',
        completedTasks: 45,
        totalTasks: 100,
        lastUpdated: new Date().toISOString()
      };
    } catch (error) {
      console.error('Erro ao verificar status do workflow n8n:', error);
      throw error;
    }
  }
};
