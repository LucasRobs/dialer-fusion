
import React from 'react';
import Navbar from '@/components/Navbar';
import ClientList from '@/components/ClientList';

const ClientsPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-28 pb-16">
        <ClientList />
      </div>
    </div>
  );
};

export default ClientsPage;
