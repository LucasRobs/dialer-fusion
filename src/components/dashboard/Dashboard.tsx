
import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import DashboardHeader from './DashboardHeader';
import ActiveCampaign from './ActiveCampaign';
import StatsGrid from './StatsGrid';
import QuickActions from './QuickActions';
import { campaignService } from '@/services/campaignService';
import { clientService } from '@/services/clientService';
import { toast } from 'sonner';
import assistantService from '@/services/assistantService';
import { webhookService } from '@/services/webhookService';

const Dashboard = () => {
  const [activeCampaign, setActiveCampaign] = useState<any | null>(null);
  const [selectedAssistant, setSelectedAssistant] = useState<any | null>(null);
  
  // Get the user from AuthContext
  const { user } = useAuth();
  
  // Buscar campanhas ativas
  const { data: activeCampaigns, isLoading: loadingCampaigns, error: campaignsError, refetch: refetchCampaigns } = useQuery({
    queryKey: ['activeCampaigns'],
    queryFn: async () => {
      try {
        return await campaignService.getCampaigns().then(campaigns => 
          campaigns.filter(campaign => campaign.status === 'active')
        );
      } catch (error) {
        console.error("Erro ao buscar campanhas ativas:", error);
        return [];
      }
    }
  });
  
  // Buscar assistente selecionado
  const { data: assistants } = useQuery({
    queryKey: ['assistants'],
    queryFn: async () => {
      try {
        if (!user?.id) return [];
        return await webhookService.getAllAssistants(user.id);
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
        setSelectedAssistant(JSON.parse(storedAssistant));
      } else if (assistants && assistants.length > 0) {
        // Filter out pending assistants
        const readyAssistants = assistants.filter(asst => asst.status !== 'pending');
        if (readyAssistants.length > 0) {
          setSelectedAssistant(readyAssistants[0]);
          localStorage.setItem('selected_assistant', JSON.stringify(readyAssistants[0]));
        }
      }
    } catch (error) {
      console.error("Erro ao carregar assistente selecionado:", error);
    }
  }, [assistants]);
  
  // Buscar estatísticas dos clientes
  const { data: clientStats, isLoading: loadingClientStats } = useQuery({
    queryKey: ['clientStats'],
    queryFn: async () => {
      try {
        return await clientService.getClientStats();
      } catch (error) {
        console.error("Erro ao buscar estatísticas de clientes:", error);
        return { totalClients: 0, activeClients: 0 };
      }
    }
  });
  
  // Buscar estatísticas de campanhas
  const { data: campaignStats, isLoading: loadingCampaignStats } = useQuery({
    queryKey: ['campaignStats'],
    queryFn: async () => {
      try {
        return await campaignService.getCampaignStats();
      } catch (error) {
        console.error("Erro ao buscar estatísticas de campanhas:", error);
        return { 
          recentCalls: 0, 
          avgCallDuration: '0:00', 
          callsToday: 0, 
          completionRate: '0%' 
        };
      }
    }
  });
  
  useEffect(() => {
    if (activeCampaigns && activeCampaigns.length > 0) {
      const campaign = activeCampaigns[0];
      // Converter para o formato que o componente ActiveCampaign espera
      setActiveCampaign({
        id: campaign.id,
        name: campaign.name,
        progress: campaign.total_calls > 0 ? Math.round((campaign.answered_calls / campaign.total_calls) * 100) : 0,
        startTime: campaign.start_date ? new Date(campaign.start_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '00:00',
        callsMade: campaign.answered_calls || 0,
        callsRemaining: (campaign.total_calls || 0) - (campaign.answered_calls || 0),
        active: true,
        assistantName: selectedAssistant?.name || 'Default Assistant'
      });
    } else {
      setActiveCampaign(null);
    }
  }, [activeCampaigns, selectedAssistant]);
  
  const handleCampaignStopped = async () => {
    if (activeCampaign) {
      try {
        await campaignService.updateCampaign(activeCampaign.id, {
          status: 'stopped'
        });
        setActiveCampaign(null);
        refetchCampaigns();
        toast.success("Campanha interrompida com sucesso");
      } catch (error) {
        console.error("Erro ao interromper campanha:", error);
        toast.error("Erro ao interromper campanha");
      }
    }
  };
  
  // Compilar estatísticas para o StatsGrid
  const stats = {
    totalClients: clientStats?.totalClients || 0,
    activeClients: clientStats?.activeClients || 0,
    recentCalls: campaignStats?.recentCalls || 0,
    avgCallDuration: campaignStats?.avgCallDuration || '0:00',
    callsToday: campaignStats?.callsToday || 0,
    completionRate: campaignStats?.completionRate || '0%',
  };
  
  const isLoading = loadingCampaigns || loadingClientStats || loadingCampaignStats;
  
  if (campaignsError) {
    console.error("Erro ao carregar dados do dashboard:", campaignsError);
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <DashboardHeader />
      
      {/* Active Campaign Section */}
      {activeCampaign && (
        <ActiveCampaign 
          campaign={activeCampaign} 
          onCampaignStopped={handleCampaignStopped}
        />
      )}

      {/* Stats Grid */}
      <StatsGrid stats={stats} isLoading={isLoading} />

      {/* Quick Actions */}
      <h2 className="text-2xl font-bold mb-4">Ações Rápidas</h2>
      <QuickActions />
    </div>
  );
};

export default Dashboard;
