import { supabase } from '../../lib/supabase';

export async function handleMercadoPagoWebhook(req: Request) {
  try {
    const data = await req.json();

    // Verificar se é uma notificação de pagamento
    if (data.type === 'payment') {
      const paymentId = data.data.id;
      
      // Buscar informações do pagamento
      const response = await fetch(
        `https://api.mercadopago.com/v1/payments/${paymentId}`,
        {
          headers: {
            'Authorization': `Bearer ${process.env.MERCADO_PAGO_ACCESS_TOKEN}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Erro ao buscar detalhes do pagamento');
      }

      const payment = await response.json();
      
      // Atualizar status no Supabase
      if (payment.status === 'approved') {
        const { error } = await supabase
          .from('user_payments')
          .update({ 
            status: 'approved',
            updated_at: new Date().toISOString()
          })
          .eq('payment_id', payment.external_reference);

        if (error) {
          console.error('Erro ao atualizar status do pagamento:', error);
          return new Response('Erro ao atualizar status', { status: 500 });
        }
      }
    }

    return new Response('OK', { status: 200 });
  } catch (error) {
    console.error('Erro ao processar webhook:', error);
    return new Response('Erro interno', { status: 500 });
  }
} 