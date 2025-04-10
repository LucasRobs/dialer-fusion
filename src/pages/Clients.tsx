
import React, { useState } from 'react';
import Navbar from '@/components/Navbar';
import ClientList from '@/components/ClientList';
import ClientGroupManager from '@/components/ClientGroupManager';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

const ClientsPage = () => {
  const [activeTab, setActiveTab] = useState('clients');
  const queryClient = useQueryClient();
  
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-28 pb-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <div className="flex-1">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
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
        </div>
      </div>
    </div>
  );
};

export default ClientsPage;
