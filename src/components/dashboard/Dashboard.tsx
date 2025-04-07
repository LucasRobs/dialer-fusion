import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import DashboardHeader from './DashboardHeader';
import StatsGrid from './StatsGrid';
import QuickActions from './QuickActions';
import { clientService } from '@/services/clientService';
import { clientGroupService } from '@/services/clientGroupService';

const Dashboard = () => {
  // Get the user from AuthContext
  const { user } = useAuth();
  
  // Fetch client stats (clients count and groups count)
  const { data: clientStats, isLoading: loadingClientStats } = useQuery({
    queryKey: ['clientStats'],
    queryFn: async () => {
      try {
        const clientStatsData = await clientService.getClientStats();
        
        // Fetch client groups count
        const clientGroups = await clientGroupService.getClientGroups();
        const groupsCount = clientGroups?.length || 0;
        
        return { 
          ...clientStatsData,
          totalGroups: groupsCount
        };
      } catch (error) {
        console.error("Erro ao buscar estatísticas:", error);
        return { 
          totalClients: 0, 
          activeClients: 0,
          totalGroups: 0 
        };
      }
    }
  });
  
  // Compile stats for StatsGrid with safe default values
  const stats = {
    totalClients: clientStats?.totalClients || 0,
    activeClients: clientStats?.activeClients || 0,
    totalGroups: clientStats?.totalGroups || 0,
  };
  
  const isLoading = loadingClientStats;

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <DashboardHeader />
      
      {/* Stats Grid - including real group counts */}
      <StatsGrid stats={stats} isLoading={isLoading} />

      {/* Quick Actions */}
      <h2 className="text-2xl font-bold mb-4">Ações Rápidas</h2>
      <QuickActions />
    </div>
  );
};

export default Dashboard;
