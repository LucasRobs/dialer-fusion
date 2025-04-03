import { supabase } from '@/lib/supabase';
import { clientGroupService } from '@/services/clientGroupService';

interface Campaign {
  id?: number;
  name?: string;
  status?: string;
  total_calls?: number;
  answered_calls?: number;
  start_date?: string | null;
  end_date?: string | null;
  average_duration?: number;
  user_id?: string;
  client_group_id?: string | null;
}

interface AnalyticsData {
  totalCalls: number;
  callsChangePercentage: number;
  avgCallDuration: string;
  durationChangePercentage: number;
  conversionRate: number;
  conversionChangePercentage: number;
  callsData: {
    name: string;
    calls: number;
    cost: number;
  }[];
  campaignData: {
    name: string;
    value: number;
  }[];
}


export const campaignService = {
  async getCampaigns() {
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;

      if (!userId) {
        console.error('No authenticated user found');
        return [];
      }

      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching campaigns:', error);
      return [];
    }
  },


  // Adicionando a função solicitada
  async getClientGroupsWithCounts() {
    try {
      // Buscar grupos de clientes
      const groups = await clientGroupService.getClientGroups();

      // Contar os clientes em cada grupo
      const groupsWithCounts = await Promise.all(
        groups.map(async (group) => {
          const { count, error } = await supabase
            .from('client_group_members')
            .select('*', { count: 'exact', head: true })
            .eq('group_id', group.id);

          if (error) {
            console.error(`Erro ao contar clientes no grupo ${group.id}:`, error);
            return { ...group, client_count: 0 };
          }

          return { ...group, client_count: count || 0 };
        })
      );

      return groupsWithCounts;
    } catch (error) {
      console.error('Erro ao buscar grupos de clientes:', error);
      return [];
    }
  },

    // Outras funções existentes no serviço...
    async createCampaign(campaign: Campaign) {
      try {
        const { data: userData } = await supabase.auth.getUser();
        const userId = userData?.user?.id;
  
        if (!userId) {
          throw new Error('No authenticated user found');
        }
  
        const campaignWithUserId = {
          ...campaign,
          user_id: userId,
        };
  
        const { data, error } = await supabase
          .from('campaigns')
          .insert([campaignWithUserId])
          .select()
          .single();
  
        if (error) throw error;
  
        if (data && data.id && campaign.client_group_id && campaign.client_group_id !== 'all') {
          await this.prepareCampaignClientsFromGroup(data.id, campaign.client_group_id);
        }
  
        return data;
      } catch (error) {
        console.error('Error creating campaign:', error);
        throw error;
      }
    },


    async prepareCampaignClientsFromGroup(campaignId: number, groupId: string) {
      try {
        const { data: groupMembers, error: groupError } = await supabase
          .from('client_group_members')
          .select('client_id')
          .eq('group_id', groupId);
  
        if (groupError) {
          console.error('Erro ao buscar membros do grupo:', groupError);
          throw groupError;
        }
  
        if (!groupMembers || groupMembers.length === 0) {
          console.log('Nenhum cliente encontrado neste grupo.');
          return;
        }
  
        const clientIds = groupMembers.map((member) => member.client_id);
  
        const campaignClients = clientIds.map((clientId) => ({
          campaign_id: campaignId,
          client_id: clientId,
          status: 'pending',
        }));
  
        const { error: insertError } = await supabase
          .from('campaign_clients')
          .insert(campaignClients);
  
        if (insertError) {
          console.error('Erro ao inserir clientes na campanha:', insertError);
          throw insertError;
        }
  
        await supabase
          .from('campaigns')
          .update({ total_calls: clientIds.length })
          .eq('id', campaignId);
  
        console.log(`Clientes do grupo ${groupId} associados à campanha ${campaignId}.`);
      } catch (error) {
        console.error('Erro ao preparar clientes da campanha a partir do grupo:', error);
        throw error;
      }
    },
  
  // Get active campaigns (status = 'active') for current user only
  async getActiveCampaigns() {
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;
      
      if (!userId) {
        console.error('No authenticated user found');
        return [];
      }
      
      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .eq('status', 'active')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching active campaigns:', error);
      return [];
    }
  },
  
  // Get campaign statistics for current user only
  async getCampaignStats() {
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;
      
      if (!userId) {
        console.error('No authenticated user found');
        return {
          recentCalls: 0,
          avgCallDuration: '0:00',
          callsToday: 0,
          completionRate: '0%'
        };
      }
      
      // Fetch recent calls for the current user
      const now = new Date();
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(now.getDate() - 30);
      
      // Fixed: Join calls with campaigns to filter by user_id
      const { data: campaigns } = await supabase
        .from('campaigns')
        .select('id')
        .eq('user_id', userId);
      
      let recentCallsData: any[] = [];
      let todayCalls: any[] = [];
      
      if (campaigns && campaigns.length > 0) {
        const campaignIds = campaigns.map(c => c.id);
        
        // Fetch calls associated with user's campaigns
        const { data: callsData, error: callsError } = await supabase
          .from('calls')
          .select('*')
          .in('campaign_id', campaignIds)
          .gte('call_start', thirtyDaysAgo.toISOString());
        
        if (callsError) {
          console.error('Error fetching recent calls:', callsError);
        } else {
          recentCallsData = callsData || [];
        }
        
        // Fetch today's calls
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const { data: todayCallsData, error: todayCallsError } = await supabase
          .from('calls')
          .select('*')
          .in('campaign_id', campaignIds)
          .gte('call_start', today.toISOString());
        
        if (todayCallsError) {
          console.error('Error fetching today\'s calls:', todayCallsError);
        } else {
          todayCalls = todayCallsData || [];
        }
      }
      
      // Calculate average call duration
      const completedCalls = recentCallsData.filter(call => 
        call.status === 'completed' || call.status === 'answered'
      ) || [];
      
      const totalDuration = completedCalls.reduce(
        (sum, call) => sum + (call.duration || 0), 0
      );
      
      const avgDuration = completedCalls.length > 0 
        ? totalDuration / completedCalls.length 
        : 0;
      
      const minutes = Math.floor(avgDuration / 60);
      const seconds = Math.floor(avgDuration % 60);
      
      // Calculate completion rate
      const completionRate = recentCallsData.length > 0
        ? Math.round((completedCalls.length / recentCallsData.length) * 100)
        : 0;
      
      return {
        recentCalls: recentCallsData.length || 0,
        avgCallDuration: `${minutes}:${seconds.toString().padStart(2, '0')}`,
        callsToday: todayCalls.length || 0,
        completionRate: `${completionRate}%`
      };
    } catch (error) {
      console.error('Error fetching campaign stats:', error);
      return {
        recentCalls: 0,
        avgCallDuration: '0:00',
        callsToday: 0,
        completionRate: '0%'
      };
    }
  },
  
  async getCampaignById(id: number) {
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;
      
      if (!userId) {
        console.error('No authenticated user found');
        return null;
      }
      
      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .eq('id', id)
        .eq('user_id', userId)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error(`Error fetching campaign ${id}:`, error);
      return null;
    }
  },
  
  async updateCampaign(id: number, updates: Partial<Campaign>) {
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;
      
      if (!userId) {
        throw new Error('No authenticated user found');
      }
      
      // First check if the campaign exists and belongs to the current user
      const { data: existingCampaign, error: checkError } = await supabase
        .from('campaigns')
        .select('id')
        .eq('id', id)
        .eq('user_id', userId)
        .maybeSingle();
        
      if (checkError) {
        console.error('Error checking campaign existence:', checkError);
        throw checkError;
      }
      
      if (!existingCampaign) {
        throw new Error(`Campaign with ID ${id} not found or not owned by current user`);
      }
      
      // Now update the campaign
      const { data, error } = await supabase
        .from('campaigns')
        .update(updates)
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single();
      
      if (error) {
        console.error('Error updating campaign:', error);
        throw error;
      }
      
      return data;
    } catch (error) {
      console.error(`Error updating campaign ${id}:`, error);
      throw error;
    }
  },
  
  async deleteCampaign(id: number) {
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;
      
      if (!userId) {
        throw new Error('No authenticated user found');
      }
      
      // Only delete if campaign belongs to current user
      const { error } = await supabase
        .from('campaigns')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);
      
      if (error) throw error;
      return true;
    } catch (error) {
      console.error(`Error deleting campaign ${id}:`, error);
      throw error;
    }
  },
  
  async getAnalyticsData(): Promise<AnalyticsData> {
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;
      
      if (!userId) {
        throw new Error('No authenticated user found');
      }
      
      // Fixed: Fetch calls data using a different approach
      let callsData: any[] = [];
      
      // First get all campaigns for the user
      const { data: campaigns } = await supabase
        .from('campaigns')
        .select('id')
        .eq('user_id', userId);
      
      if (campaigns && campaigns.length > 0) {
        const campaignIds = campaigns.map(c => c.id);
        
        // Then get calls associated with those campaigns
        const { data: calls, error: callsError } = await supabase
          .from('calls')
          .select('*')
          .in('campaign_id', campaignIds)
          .order('call_start', { ascending: false });
        
        if (callsError) {
          console.error('Error fetching calls for analytics:', callsError);
        } else {
          callsData = calls || [];
        }
      }
      
      // Process the data
      const completedCalls = callsData.filter(call => 
        call.status === 'completed' || call.status === 'answered'
      ) || [];
      
      const totalCallDuration = callsData.reduce(
        (sum, call) => sum + (call.duration || 0), 0
      ) || 0;
      
      const avgDuration = callsData.length > 0 
        ? totalCallDuration / callsData.length 
        : 0;
        
      const minutes = Math.floor(avgDuration / 60);
      const seconds = Math.floor(avgDuration % 60);
      
      // Generate sample data if real data is insufficient
      const sampleMonthlyData = [
        { name: 'Jan 2023', calls: 15, cost: 45.00 },
        { name: 'Feb 2023', calls: 20, cost: 62.50 },
        { name: 'Mar 2023', calls: 25, cost: 78.30 },
        { name: 'Apr 2023', calls: 18, cost: 53.20 }
      ];
      
      const sampleCampaignData = [
        { name: 'Summer Sale', value: 30 },
        { name: 'Follow-up', value: 45 },
        { name: 'New Product', value: 25 }
      ];
      
      // Return analytics data
      return {
        totalCalls: callsData.length || 0,
        callsChangePercentage: 10,
        avgCallDuration: `${minutes}:${seconds.toString().padStart(2, '0')}`,
        durationChangePercentage: 5,
        conversionRate: callsData.length > 0 
          ? Math.round((completedCalls.length / callsData.length) * 100) 
          : 0,
        conversionChangePercentage: 2,
        callsData: callsData.length > 0 
          ? this.processCallsDataByMonth(callsData) 
          : sampleMonthlyData,
        campaignData: callsData.length > 0 
          ? this.processCallsDataByCampaign(callsData) 
          : sampleCampaignData
      };
    } catch (error) {
      console.error('Error getting analytics data:', error);
      
      // Return default data if there's an error
      return {
        totalCalls: 0,
        callsChangePercentage: 0,
        avgCallDuration: '0:00',
        durationChangePercentage: 0,
        conversionRate: 0,
        conversionChangePercentage: 0,
        callsData: [],
        campaignData: []
      };
    }
  },
  
  // Helper to process calls data by month
  processCallsDataByMonth(callsData: any[]) {
    const callsByMonth: Record<string, { calls: number, cost: number }> = {};
    
    callsData.forEach(call => {
      if (!call.call_start) return;
      
      try {
        const date = new Date(call.call_start);
        const monthYear = `${date.toLocaleString('default', { month: 'short' })} ${date.getFullYear()}`;
        
        if (!callsByMonth[monthYear]) {
          callsByMonth[monthYear] = { calls: 0, cost: 0 };
        }
        
        callsByMonth[monthYear].calls += 1;
        callsByMonth[monthYear].cost += (call.duration || 0) * 0.01; // Example cost calculation
      } catch (e) {
        console.error('Error processing call date:', e);
      }
    });
    
    return Object.entries(callsByMonth).map(([name, data]) => ({
      name,
      calls: data.calls,
      cost: parseFloat(data.cost.toFixed(2))
    }));
  },
  
  // Helper to process calls data by campaign
  processCallsDataByCampaign(callsData: any[]) {
    const callsByCampaign: Record<string, number> = {};
    
    callsData.forEach(call => {
      if (!call.campaign_id) return;
      
      // Use campaign ID as fallback
      const campaignName = `Campaign ${call.campaign_id}`;
      
      if (!callsByCampaign[campaignName]) {
        callsByCampaign[campaignName] = 0;
      }
      
      callsByCampaign[campaignName] += 1;
    });
    
    // If we don't have enough data, add some sample data
    if (Object.keys(callsByCampaign).length < 3) {
      callsByCampaign['Follow-up'] = callsByCampaign['Follow-up'] || 12;
      callsByCampaign['New Customers'] = callsByCampaign['New Customers'] || 8;
      callsByCampaign['Retention'] = callsByCampaign['Retention'] || 15;
    }
    
    return Object.entries(callsByCampaign).map(([name, value]) => ({
      name,
      value
    }));
  }
};
