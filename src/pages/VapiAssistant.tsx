
import React from 'react';
import Navbar from '@/components/Navbar';
import AITraining from '@/components/AITraining';
import { useAuth } from '@/contexts/AuthContext';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

const VapiAssistantPage = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-28 pb-16">
        {!user ? (
          <div className="container mx-auto px-4">
            <Alert className="mb-8 border-primary/20 bg-primary/5">
              <Info className="h-4 w-4 text-primary" />
              <AlertTitle>Login Necessário</AlertTitle>
              <AlertDescription className="flex items-center justify-between">
                <span>Você precisa estar logado para criar e gerenciar assistentes virtuais.</span>
                <Link to="/login">
                  <Button size="sm" className="mt-2">Fazer Login</Button>
                </Link>
              </AlertDescription>
            </Alert>
          </div>
        ) : (
          <AITraining />
        )}
      </div>
    </div>
  );
};

export default VapiAssistantPage;
