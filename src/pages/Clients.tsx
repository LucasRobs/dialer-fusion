
import React, { useState } from 'react';
import Navbar from '@/components/Navbar';
import ClientList from '@/components/ClientList';
import ClientGroupManager from '@/components/ClientGroupManager';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Criando um QueryClient dedicado para esta página para melhor isolamento e gerenciamento de cache
const clientsQueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10000, // 10 segundos
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const ClientsPage = () => {
  const [activeTab, setActiveTab] = useState('clients');
  
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <QueryClientProvider client={clientsQueryClient}>
        <div className="pt-28 pb-16 px-4">
          <div className="max-w-6xl mx-auto">
            <Tabs defaultValue="clients" value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-8">
                <TabsTrigger value="clients">Clientes</TabsTrigger>
                <TabsTrigger value="groups">Grupos</TabsTrigger>
              </TabsList>
              <TabsContent value="clients">
                <ClientList />
              </TabsContent>
              <TabsContent value="groups">
                <ClientGroupManager />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </QueryClientProvider>
    </div>
  );
};

export default ClientsPage;
