import React from 'react';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import { usePayment } from '../hooks/usePayment';

interface PaymentPageProps {
  userId: string;
}

export const PaymentPage: React.FC<PaymentPageProps> = ({ userId }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { createSubscription, loading, error, isPaid, isSubscription, nextPaymentDate } = usePayment(userId);

  const handleSubscribe = async () => {
    try {
      const { paymentUrl } = await createSubscription();
      window.location.href = paymentUrl;
    } catch (err) {
      console.error('Erro ao iniciar assinatura:', err);
    }
  };

  // Se já estiver pago, redireciona para a página anterior ou home
  if (isPaid) {
    const from = location.state?.from?.pathname || '/';
    return <Navigate to={from} replace />;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Acesso Premium
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Desbloqueie todas as funcionalidades da plataforma
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-lg font-medium text-gray-900">Plano Premium</h3>
              <p className="mt-1 text-4xl font-bold text-primary">
                R$ 500,00
              </p>
              <p className="mt-2 text-sm text-gray-500">
                Assinatura mensal recorrente
              </p>
              <p className="mt-1 text-sm text-gray-500">
                Cobrança todo dia 10 do mês
              </p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
                {error.message}
              </div>
            )}

            <div className="space-y-4">
              <button
                onClick={handleSubscribe}
                disabled={loading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50"
              >
                {loading ? 'Processando...' : 'Assinar Agora'}
              </button>

              <p className="text-xs text-center text-gray-500">
                Ao assinar, você concorda com nossos Termos de Uso e Política de Privacidade.
                O pagamento será processado de forma segura pelo Mercado Pago.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}; 