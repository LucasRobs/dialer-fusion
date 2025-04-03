import React, { useState, useEffect } from 'react';
import {
  PauseCircle,
  StopCircle,
  PlayCircle,
  Trash2,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardFooter 
} from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import WorkflowStatus from '@/components/WorkflowStatus';
import { webhookService } from '@/services/webhookService';
import { campaignService } from '@/services/campaignService';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { clientGroupService } from '@/services/clientGroupService';
import { supabase } from '@/lib/supabase';

const getStatusColor = (status: string): string => {
  switch (status) {
    case 'active':
      return 'bg-green-500';
    case 'draft':
      return 'bg-yellow-500';
    case 'completed':
      return 'bg-blue-500';
    case 'paused':
      return 'bg-gray-500';
    default:
      return 'bg-red-500';
  }
};

const CampaignControls = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  const [campaigns, setCampaigns] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isStartingCampaign, setIsStartingCampaign] = useState(false);
  const [newCampaign, setNewCampaign] = useState({
    name: '',
    clientGroup: '',
    aiProfile: '',
  });

  // Buscar grupos de clientes e contar os clientes em cada grupo
  const { data: userClientGroups = [], isLoading: isLoadingGroups } = useQuery({
    queryKey: ['userClientGroups', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      return await clientGroupService.getClientGroups(); // Filtrar pelo user_id no serviço
    },
    enabled: !!user?.id,
  });

  // Fetch campaigns
  const { data: supabaseCampaignsData, refetch: refetchCampaigns } = useQuery({
    queryKey: ['campaigns', user?.id],
    queryFn: async () => await campaignService.getCampaigns(),
    enabled: !!user?.id,
    staleTime: 0,
  });

  // Fetch assistants
  const { data: assistants = [], isLoading: isLoadingAssistants } = useQuery({
    queryKey: ['assistants', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      return await webhookService.getAllAssistants(user.id); // Filtrar pelo user_id
    },
    enabled: !!user?.id,
  });

  // Fetch clients for selected group
  const [selectedGroupClients, setSelectedGroupClients] = useState([]);
  const [isLoadingClients, setIsLoadingClients] = useState(false);

  const fetchClientsForGroup = async (groupId) => {
    if (!groupId) return;
    
    setIsLoadingClients(true);
    try {
      // Get the client group members
      const { data: memberData, error: memberError } = await supabase
        .from('client_group_members')
        .select('client_id')
        .eq('group_id', groupId);

      if (memberError) throw memberError;

      if (memberData && memberData.length > 0) {
        const clientIds = memberData.map(item => item.client_id);
        
        // Get the actual client data
        const { data: clientData, error: clientError } = await supabase
          .from('clients')
          .select('*')
          .in('id', clientIds);

        if (clientError) throw clientError;
        
        setSelectedGroupClients(clientData || []);
      } else {
        setSelectedGroupClients([]);
      }
    } catch (error) {
      console.error('Error fetching clients for group:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os clientes deste grupo',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingClients(false);
    }
  };

  useEffect(() => {
    if (newCampaign.clientGroup) {
      fetchClientsForGroup(newCampaign.clientGroup);
    }
  }, [newCampaign.clientGroup]);

  useEffect(() => {
    if (supabaseCampaignsData) {
      const formattedCampaigns = supabaseCampaignsData.map((campaign) => ({
        id: campaign.id,
        name: campaign.name || 'Untitled Campaign',
        status: campaign.status || 'draft',
        progress:
          campaign.total_calls > 0
            ? Math.round((campaign.answered_calls / campaign.total_calls) * 100)
            : 0,
        clientGroup: campaign.client_group_id,
        clientCount: campaign.total_calls || 0,
        completedCalls: campaign.answered_calls || 0,
        aiProfile: campaign.assistant_id || '',
        startDate: campaign.start_date
          ? new Date(campaign.start_date).toLocaleDateString()
          : new Date().toLocaleDateString(),
      }));

      setCampaigns(formattedCampaigns);
      setIsLoading(false);
    }
  }, [supabaseCampaignsData]);

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newCampaign.name || !newCampaign.clientGroup || !newCampaign.aiProfile) {
      toast({
        title: 'Erro',
        description: 'Por favor, preencha todos os campos obrigatórios',
        variant: 'destructive',
      });
      return;
    }

    const selectedGroup = userClientGroups.find(
      (group) => group.id.toString() === newCampaign.clientGroup
    );
    const clientCount = selectedGroup ? selectedGroup.client_count || 0 : 0;

    const selectedAssistant = assistants.find(
      (assistant) => assistant.id.toString() === newCampaign.aiProfile
    );

    if (!selectedAssistant) {
      toast({
        title: 'Erro',
        description: 'Por favor, selecione um assistente de IA válido',
        variant: 'destructive',
      });
      return;
    }

    try {
      // Salvar o assistente selecionado no localStorage
      localStorage.setItem('selected_assistant', JSON.stringify(selectedAssistant));
      console.log('Assistente selecionado para campanha:', selectedAssistant);

      setIsSubmitting(true);

      const createdCampaign = await campaignService.createCampaign({
        name: newCampaign.name,
        status: 'draft',
        total_calls: clientCount,
        answered_calls: 0,
        start_date: null,
        end_date: null,
        user_id: user?.id,
        client_group_id: newCampaign.clientGroup !== 'all' ? newCampaign.clientGroup : null,
        assistant_id: newCampaign.aiProfile,
      });

      toast({
        title: 'Campanha Criada',
        description: `Sua campanha "${newCampaign.name}" foi criada com o assistente "${selectedAssistant.name}"`,
      });

      setNewCampaign({
        name: '',
        clientGroup: '',
        aiProfile: '',
      });

      await refetchCampaigns();
    } catch (error) {
      console.error('Erro ao criar campanha:', error);
      toast({
        title: 'Erro ao Criar Campanha',
        description: 'Houve um problema ao criar sua campanha. Por favor, tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Função para iniciar a campanha e enviar o webhook
  const handleStartCampaign = async (campaign) => {
    setIsStartingCampaign(true);
    
    try {
      // Buscar o assistente pelo ID
      const selectedAssistant = assistants.find(
        (assistant) => assistant.id.toString() === campaign.aiProfile
      );
      
      if (!selectedAssistant) {
        throw new Error("Assistente não encontrado");
      }
      
      // Buscar os clientes do grupo
      await fetchClientsForGroup(campaign.clientGroup);
      
      if (selectedGroupClients.length === 0) {
        throw new Error("Nenhum cliente encontrado neste grupo");
      }
      
      // Atualizar o status da campanha para 'active'
      await campaignService.updateCampaign(campaign.id, {
        status: 'active',
        start_date: new Date().toISOString(),
      });
      
      // Para cada cliente no grupo, enviar um webhook
      for (const client of selectedGroupClients) {
        const webhookData = {
          client_name: client.name,
          client_phone: client.phone,
          assistant_id: selectedAssistant.id
        };
        
        console.log(`Enviando webhook para cliente ${client.name}:`, webhookData);
        
        // Enviar o webhook
        await fetch('https://primary-production-31de.up.railway.app/webhook/collowop', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(webhookData),
        });
      }
      
      toast({
        title: "Campanha Iniciada",
        description: `A campanha "${campaign.name}" foi iniciada com sucesso para ${selectedGroupClients.length} clientes.`,
      });
      
      // Atualizar a lista de campanhas
      await refetchCampaigns();
      
    } catch (error) {
      console.error("Erro ao iniciar campanha:", error);
      toast({
        title: "Erro ao Iniciar Campanha",
        description: error.message || "Houve um problema ao iniciar sua campanha. Por favor, tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsStartingCampaign(false);
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-7xl">
      {/* Restante do código permanece o mesmo */}
    </div>
  );
};

export default CampaignControls;