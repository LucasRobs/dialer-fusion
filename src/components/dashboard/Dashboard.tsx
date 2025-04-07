import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import DashboardHeader from './DashboardHeader';
import StatsGrid from './StatsGrid';
import QuickActions from './QuickActions';
import { clientService } from '@/services/clientService';
import { clientGroupService } from '@/services/clientGroupService';
import assistantService from '@/services/assistantService';
import { webhookService, VapiAssistant } from '@/services/webhookService';

// Define interface that ensures status is required
interface AIAssistant extends Omit<VapiAssistant, 'status'> {
  status: string; // Making status required
}

const Dashboard = () => {
  const [selectedAssistant, setSelectedAssistant] = useState<AIAssistant | null>(null);
  
  // Get the user from AuthContext
  const { user } = useAuth();
  
  // Buscar assistentes - usando a API do webhook
  const { data: assistants, isLoading: loadingAssistants, refetch: refetchAssistants } = useQuery({
    queryKey: ['assistants', user?.id],
    queryFn: async () => {
      try {
        if (!user?.id) return [];
        
        // Priorizar busca de assistentes locais para evitar problemas de CORS
        const allAssistants = await webhookService.getLocalAssistants(user.id);
        
        // Garantir que todos os assistentes tenham um status definido
        return allAssistants.map(assistant => ({
          ...assistant,
          status: assistant.status || 'ready'
        })) as AIAssistant[];
      } catch (error) {
        console.error("Erro ao buscar assistentes:", error);
        return [];
      }
    },
    enabled: !!user?.id
  });
  
  // Load selected assistant from localStorage
  useEffect(() => {
    try {
      const storedAssistant = localStorage.getItem('selected_assistant');
      if (storedAssistant) {
        const parsedAssistant = JSON.parse(storedAssistant);
        // Ensure status is always present
        const validAssistant: AIAssistant = {
          ...parsedAssistant,
          status: parsedAssistant.status || 'ready'
        };
        setSelectedAssistant(validAssistant);
      } else if (assistants && assistants.length > 0) {
        // Filter out pending assistants
        const readyAssistants = assistants.filter(asst => asst.status !== 'pending');
        if (readyAssistants.length > 0) {
          // Ensure status is always present
          const validAssistant: AIAssistant = {
            ...readyAssistants[0],
            status: readyAssistants[0].status || 'ready'
          };
          setSelectedAssistant(validAssistant);
          localStorage.setItem('selected_assistant', JSON.stringify(validAssistant));
        }
      }
    } catch (error) {
      console.error("Erro ao carregar assistente selecionado:", error);
    }
  }, [assistants]);
  
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
  
  // Compilar estatísticas para o StatsGrid com valores padrão seguros
  const stats = {
    totalClients: clientStats?.totalClients || 0,
    activeClients: clientStats?.activeClients || 0,
    totalGroups: clientStats?.totalGroups || 0,
  };
  
  const isLoading = loadingClientStats;

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <DashboardHeader />
      
      {/* Stats Grid - now including groups count */}
      <StatsGrid stats={stats} isLoading={isLoading} />

      {/* Quick Actions */}
      <h2 className="text-2xl font-bold mb-4">Ações Rápidas</h2>
      <QuickActions />
    </div>
  );
};

export default Dashboard;
