
import React, { useState } from 'react';
import Navbar from '@/components/Navbar';
import ClientList from '@/components/ClientList';
import ClientGroupManager from '@/components/ClientGroupManager';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const ClientsPage = () => {
  const [activeTab, setActiveTab] = useState('clients');
  
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
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
    </div>
  );
};

export default ClientsPage;
