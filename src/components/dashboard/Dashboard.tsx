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
import { webhookService, VapiAssistant } from '@/services/webhookService';

// Define interface that ensures status is required
interface AIAssistant extends Omit<VapiAssistant, 'status'> {
  status: string; // Making status required
}

const Dashboard = () => {
  const [activeCampaign, setActiveCampaign] = useState<any | null>(null);
  const [selectedAssistant, setSelectedAssistant] = useState<AIAssistant | null>(null);
  
  // Get the user from AuthContext
  const { user } = useAuth();
  
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
  
  // Buscar assistentes - usando a API do webhook
  const { data: assistants, isLoading: loadingAssistants, refetch: refetchAssistants } = useQuery({
    queryKey: ['assistants', user?.id],
    queryFn: async () => {
      try {
        if (!user?.id) return [];
        console.log("Buscando assistentes para o usuário:", user.id);
        
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
        console.log("Loaded selected assistant from localStorage:", validAssistant);
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
          console.log("Set first ready assistant as selected:", validAssistant);
        }
      }
    } catch (error) {
      console.error("Erro ao carregar assistente selecionado:", error);
    }
  }, [assistants]);
  
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
      // Find the associated assistant for this campaign
      let campaignAssistant = null;
      
      // 1. Look for the assistant in our list first
      if (campaign.assistant_id && assistants && assistants.length > 0) {
        // Try to match with either id or assistant_id
        campaignAssistant = assistants.find(a => 
          a.id === campaign.assistant_id || 
          a.assistant_id === campaign.assistant_id
        );
        
        if (campaignAssistant) {
          console.log("Found campaign assistant in list:", campaignAssistant);
        }
      }
      
      // 2. Check localStorage as fallback
      if (!campaignAssistant) {
        try {
          const storedAssistant = localStorage.getItem('selected_assistant');
          if (storedAssistant) {
            const parsedAssistant = JSON.parse(storedAssistant);
            if (parsedAssistant) {
              campaignAssistant = {
                ...parsedAssistant,
                status: parsedAssistant.status || 'ready'
              };
              console.log("Using stored assistant for campaign:", campaignAssistant);
            }
          }
        } catch (e) {
          console.error("Error loading stored assistant:", e);
        }
      }
      
      // 3. Use selected assistant as last resort
      if (!campaignAssistant && selectedAssistant) {
        campaignAssistant = selectedAssistant;
        console.log("Using selected assistant for campaign:", campaignAssistant);
      }
      
      // 4. Create a default assistant as absolute last resort
      if (!campaignAssistant) {
        campaignAssistant = {
          id: campaign.assistant_id || 'default-assistant',
          name: 'Assistente Padrão',
          assistant_id: campaign.assistant_id || 'default-assistant',
          user_id: user?.id || '',
          status: 'ready'
        };
        console.log("Using default assistant for campaign:", campaignAssistant);
      }

      // Determine the best ID to use (prefer assistant_id if available)
      const assistantId = campaignAssistant.assistant_id || campaignAssistant.id;
      console.log("Final assistant ID for campaign:", assistantId);
      
      // Converter para o formato que o componente ActiveCampaign espera
      setActiveCampaign({
        id: campaign.id,
        name: campaign.name,
        progress: campaign.total_calls > 0 ? Math.round((campaign.answered_calls / campaign.total_calls) * 100) : 0,
        startTime: campaign.start_date ? new Date(campaign.start_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '00:00',
        callsMade: campaign.answered_calls || 0,
        callsRemaining: (campaign.total_calls || 0) - (campaign.answered_calls || 0),
        active: true,
        assistantName: campaignAssistant.name || 'Assistente Padrão',
        assistantId: assistantId // Add this to pass the ID
      });
    } else {
      setActiveCampaign(null);
    }
  }, [activeCampaigns, selectedAssistant, assistants, user?.id]);
  
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
  
  // Compilar estatísticas para o StatsGrid com valores padrão seguros
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