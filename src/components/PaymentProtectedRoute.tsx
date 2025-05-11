import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { usePayment } from '../hooks/usePayment';

interface PaymentProtectedRouteProps {
  children: React.ReactNode;
  userId: string;
}

export const PaymentProtectedRoute: React.FC<PaymentProtectedRouteProps> = ({ children, userId }) => {
  const location = useLocation();
  const { isPaid, loading } = usePayment(userId);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isPaid) {
    return <Navigate to="/payment" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}; 