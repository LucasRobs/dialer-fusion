import { useState, useEffect } from 'react';
import { PaymentService } from '../services/paymentService';
import { UserPayment } from '../lib/supabase';

export const usePayment = (userId: string) => {
  const [paymentStatus, setPaymentStatus] = useState<UserPayment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const paymentService = PaymentService.getInstance();

  useEffect(() => {
    const checkPaymentStatus = async () => {
      try {
        setLoading(true);
        const status = await paymentService.getUserPaymentStatus(userId);
        setPaymentStatus(status);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Erro ao verificar pagamento'));
      } finally {
        setLoading(false);
      }
    };

    checkPaymentStatus();

    // Verificar status a cada 5 minutos
    const interval = setInterval(checkPaymentStatus, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [userId]);

  const createSubscription = async () => {
    try {
      setLoading(true);
      const { paymentUrl, subscriptionId } = await paymentService.createPayment(userId);
      return { paymentUrl, subscriptionId };
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Erro ao criar assinatura'));
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const verifySubscription = async (subscriptionId: string) => {
    try {
      setLoading(true);
      const isActive = await paymentService.verifySubscription(subscriptionId);
      if (isActive) {
        const status = await paymentService.getUserPaymentStatus(userId);
        setPaymentStatus(status);
      }
      return isActive;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Erro ao verificar assinatura'));
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    paymentStatus,
    loading,
    error,
    createSubscription,
    verifySubscription,
    isPaid: paymentStatus?.status === 'approved',
    isSubscription: paymentStatus?.subscription_type === 'recurring',
    nextPaymentDate: paymentStatus?.next_payment_date ? new Date(paymentStatus.next_payment_date) : null,
  };
}; 