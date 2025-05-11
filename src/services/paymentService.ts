import { supabase, UserPayment } from '../lib/supabase';

interface MercadoPagoPayment {
  id: number;
  status: string;
  status_detail: string;
  external_reference: string;
  transaction_amount: number;
  date_created: string;
  date_approved: string;
  payer: {
    id: number;
    email: string;
  };
}

interface SubscriptionStatus {
  id: string;
  status: 'active' | 'cancelled' | 'paused';
  next_payment_date: string;
}

export class PaymentService {
  private static instance: PaymentService;
  private readonly MERCADO_PAGO_ACCESS_TOKEN: string;
  private readonly MERCADO_PAGO_API_URL = 'https://api.mercadopago.com/v1';
  private readonly SUBSCRIPTION_LINK = "https://www.mercadopago.com.br/subscriptions/checkout?preapproval_plan_id=2c93808496b4a3e80196bd212a6e032a";

  private constructor() {
    this.MERCADO_PAGO_ACCESS_TOKEN = "TEST-8668861982087-051112-67f7139273ee858dd5dbc33528a5adb6-495022656";
    if (!this.MERCADO_PAGO_ACCESS_TOKEN) {
      throw new Error('Token de acesso do Mercado Pago não configurado');
    }
  }

  public static getInstance(): PaymentService {
    if (!PaymentService.instance) {
      PaymentService.instance = new PaymentService();
    }
    return PaymentService.instance;
  }

  private async checkSubscriptionStatus(subscriptionId: string): Promise<SubscriptionStatus | null> {
    try {
      const response = await fetch(
        `${this.MERCADO_PAGO_API_URL}/preapproval/${subscriptionId}`,
        {
          headers: {
            'Authorization': `Bearer ${this.MERCADO_PAGO_ACCESS_TOKEN}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Erro ao buscar status da assinatura');
      }

      return await response.json();
    } catch (error) {
      console.error('Erro ao buscar status da assinatura:', error);
      return null;
    }
  }

  async createPayment(userId: string): Promise<{ paymentUrl: string; subscriptionId: string }> {
    try {
      const subscriptionId = `SUB_${userId}_${Date.now()}`;
      
      // Salvar a assinatura no Supabase
      const { data, error } = await supabase
        .from('user_payments')
        .insert([
          {
            user_id: userId,
            payment_id: subscriptionId,
            status: 'pending',
            subscription_type: 'recurring',
            next_payment_date: new Date().toISOString(), // Será atualizado após a primeira cobrança
          },
        ])
        .select()
        .single();

      if (error) throw error;

      return { 
        paymentUrl: this.SUBSCRIPTION_LINK,
        subscriptionId: subscriptionId 
      };
    } catch (error) {
      console.error('Erro ao criar assinatura:', error);
      throw error;
    }
  }

  async verifySubscription(subscriptionId: string): Promise<boolean> {
    try {
      const subscription = await this.checkSubscriptionStatus(subscriptionId);
      
      if (!subscription) {
        return false;
      }

      const isActive = subscription.status === 'active';

      if (isActive) {
        const { error } = await supabase
          .from('user_payments')
          .update({ 
            status: 'approved',
            updated_at: new Date().toISOString(),
            next_payment_date: subscription.next_payment_date
          })
          .eq('payment_id', subscriptionId);

        if (error) throw error;
      }

      return isActive;
    } catch (error) {
      console.error('Erro ao verificar assinatura:', error);
      throw error;
    }
  }

  async getUserPaymentStatus(userId: string): Promise<UserPayment | null> {
    try {
      const { data, error } = await supabase
        .from('user_payments')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error) throw error;

      // Verificar se é dia 10 e se a assinatura está ativa
      if (data?.subscription_type === 'recurring') {
        const today = new Date();
        const nextPayment = new Date(data.next_payment_date);
        
        // Se for dia 10 e a data do próximo pagamento for anterior a hoje
        if (today.getDate() === 10 && nextPayment < today) {
          // Verificar status da assinatura
          const isActive = await this.verifySubscription(data.payment_id);
          if (!isActive) {
            // Atualizar status para pendente se a assinatura não estiver ativa
            await supabase
              .from('user_payments')
              .update({ status: 'pending' })
              .eq('id', data.id);
            
            return { ...data, status: 'pending' };
          }
        }
      }

      return data;
    } catch (error) {
      console.error('Erro ao buscar status do pagamento:', error);
      return null;
    }
  }
} 