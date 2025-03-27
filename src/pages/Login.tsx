
import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import AuthForm from '@/components/AuthForm';
import Logo from '@/components/Logo';
import { useAuth } from '@/contexts/AuthContext';

const Login = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);
  
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 pt-32 pb-20">
        <div className="max-w-md mx-auto text-center mb-8">
          <div className="flex justify-center mb-6">
            <Logo size="lg" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Bem-vindo</h1>
          <p className="text-muted-foreground">
            Faça login na sua conta para gerenciar suas campanhas de chamadas com IA.
          </p>
        </div>
        
        <AuthForm type="login" />
      </div>
    </div>
  );
};

export default Login;
