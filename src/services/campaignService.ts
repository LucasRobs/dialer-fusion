import { supabase } from '@/lib/supabase';

export interface Campaign {
  id: number;
  name: string;
  status: 'draft' | 'active' | 'paused' | 'completed' | 'stopped';
  total_calls: number;
  answered_calls: number;
  start_date: string | null;
  end_date: string | null;
  created_at?: string;
}

export interface CampaignClient {
  id: number;
  campaign_id: number;
  client_id: number;
  status: 'pending' | 'calling' | 'completed' | 'failed';
  created_at?: string;
}

export interface Client {
  id: number;
  name: string;
  phone: string;
  email: string;
  status: string;
  created_at?: string;
}

export interface CallHistoryItem {
  id: number;
  clientName: string;
  phone: string;
  campaign: string;
  date: string;
  time: string;
  duration: string;
  status: string;
  outcome: string;
  notes?: string;
}

export interface AnalyticsData {
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
  async getCampaigns(): Promise<Campaign[]> {
    try {
      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching campaigns:', error);
        return [];
      }
      
      return data || [];
    } catch (error) {
      console.error('Error in getCampaigns:', error);
      return [];
    }
  },
  
  async getActiveCampaigns(): Promise<Campaign[]> {
    try {
      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching active campaigns:', error);
        return [];
      }
      
      return data || [];
    } catch (error) {
      console.error('Error in getActiveCampaigns:', error);
      return [];
    }
  },
  
  async getCampaignById(campaignId: number): Promise<Campaign | null> {
    try {
      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .eq('id', campaignId)
        .single();
      
      if (error) {
        console.error('Error fetching campaign:', error);
        return null;
      }
      
      return data || null;
    } catch (error) {
      console.error('Error in getCampaignById:', error);
      return null;
    }
  },
  
  async createCampaign(campaign: Omit<Campaign, 'id' | 'created_at'>): Promise<Campaign> {
    try {
      const { data, error } = await supabase
        .from('campaigns')
        .insert([campaign])
        .select()
        .single();
      
      if (error) {
        throw new Error(`Error creating campaign: ${error.message}`);
      }
      
      return data as Campaign;
    } catch (error) {
      console.error('Error in createCampaign:', error);
      throw error;
    }
  },
  
  async updateCampaign(id: number, data: Partial<Campaign>): Promise<Campaign> {
    try {
      // Verify the campaign exists first
      const { data: existingCampaign, error: checkError } = await supabase
        .from('campaigns')
        .select('*')
        .eq('id', id)
        .single();
      
      if (checkError || !existingCampaign) {
        console.error('Campaign not found before update:', checkError);
        throw new Error(checkError?.message || 'Campaign not found');
      }
      
      const { data: updatedCampaign, error } = await supabase
        .from('campaigns')
        .update(data)
        .eq('id', id)
        .select()
        .single();
      
      if (error) {
        console.error('Error updating campaign:', error);
        throw error;
      }
      
      return updatedCampaign;
    } catch (error) {
      console.error('Error updating campaign:', error);
      throw error;
    }
  },
  
  async deleteCampaign(campaignId: number): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('campaigns')
        .delete()
        .eq('id', campaignId);
      
      if (error) {
        console.error('Error deleting campaign:', error);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Error in deleteCampaign:', error);
      return false;
    }
  },
  
  async getCampaignStats(): Promise<{
    recentCalls: number;
    avgCallDuration: string;
    callsToday: number;
    completionRate: string;
  }> {
    try {
      // Implemente a lógica para buscar as estatísticas da campanha no Supabase
      // Isso pode envolver a execução de consultas SQL personalizadas ou a utilização
      // de funções do Supabase para agregar os dados.
      
      // Aqui está um exemplo de como você pode buscar o número de chamadas recentes:
      const { data: recentCallsData, error: recentCallsError } = await supabase
        .from('calls')
        .select('id')
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (recentCallsError) {
        console.error('Error fetching recent calls:', recentCallsError);
      }
      
      const recentCalls = recentCallsData ? recentCallsData.length : 0;
      
      // Aqui está um exemplo de como você pode buscar a duração média das chamadas:
      const { data: avgCallDurationData, error: avgCallDurationError } = await supabase
        .from('calls')
        .select('duration')
        .limit(100);
      
      if (avgCallDurationError) {
        console.error('Error fetching average call duration:', avgCallDurationError);
      }
      
      let totalDuration = 0;
      if (avgCallDurationData) {
        totalDuration = avgCallDurationData.reduce((sum, call) => sum + (call.duration || 0), 0);
      }
      
      const avgCallDurationInSeconds = recentCalls > 0 ? totalDuration / recentCalls : 0;
      const avgCallDuration = `${Math.floor(avgCallDurationInSeconds / 60)}:${Math.floor(avgCallDurationInSeconds % 60).toString().padStart(2, '0')}`;
      
      // Aqui está um exemplo de como você pode buscar o número de chamadas feitas hoje:
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const { data: callsTodayData, error: callsTodayError } = await supabase
        .from('calls')
        .select('id')
        .gte('created_at', today.toISOString());
      
      if (callsTodayError) {
        console.error('Error fetching calls made today:', callsTodayError);
      }
      
      const callsToday = callsTodayData ? callsTodayData.length : 0;
      
      // Aqui está um exemplo de como você pode buscar a taxa de conclusão de chamadas:
      const { data: totalCallsData, error: totalCallsError } = await supabase
        .from('calls')
        .select('id');
      
      if (totalCallsError) {
        console.error('Error fetching total calls:', totalCallsError);
      }
      
      const totalCalls = totalCallsData ? totalCallsData.length : 0;
      const completionRate = totalCalls > 0 ? `${Math.round((callsToday / totalCalls) * 100)}%` : '0%';
      
      return {
        recentCalls,
        avgCallDuration,
        callsToday,
        completionRate,
      };
    } catch (error) {
      console.error('Error in getCampaignStats:', error);
      return {
        recentCalls: 0,
        avgCallDuration: '0:00',
        callsToday: 0,
        completionRate: '0%',
      };
    }
  },
  
  async getAllCampaignClients(): Promise<CampaignClient[]> {
    try {
      const { data, error } = await supabase
        .from('campaign_clients')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching campaign clients:', error);
        return [];
      }
      
      return data || [];
    } catch (error) {
      console.error('Error in getAllCampaignClients:', error);
      return [];
    }
  },
  
  async getCampaignClients(campaignId: number): Promise<CampaignClient[]> {
    try {
      const { data, error } = await supabase
        .from('campaign_clients')
        .select('*')
        .eq('campaign_id', campaignId)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching campaign clients:', error);
        return [];
      }
      
      return data || [];
    } catch (error) {
      console.error('Error in getCampaignClients:', error);
      return [];
    }
  },
  
  async addClientToCampaign(campaignId: number, clientId: number): Promise<CampaignClient | null> {
    try {
      const { data, error } = await supabase
        .from('campaign_clients')
        .insert([{ campaign_id: campaignId, client_id: clientId, status: 'pending' }])
        .select()
        .single();
      
      if (error) {
        console.error('Error adding client to campaign:', error);
        return null;
      }
      
      return data;
    } catch (error) {
      console.error('Error in addClientToCampaign:', error);
      return null;
    }
  },
  
  async removeClientFromCampaign(campaignId: number, clientId: number): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('campaign_clients')
        .delete()
        .eq('campaign_id', campaignId)
        .eq('client_id', clientId);
      
      if (error) {
        console.error('Error removing client from campaign:', error);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Error in removeClientFromCampaign:', error);
      return false;
    }
  },
  
  async updateCampaignClientStatus(campaignId: number, clientId: number, status: CampaignClient['status']): Promise<CampaignClient | null> {
    try {
      const { data, error } = await supabase
        .from('campaign_clients')
        .update({ status })
        .eq('campaign_id', campaignId)
        .eq('client_id', clientId)
        .select()
        .single();
      
      if (error) {
        console.error('Error updating campaign client status:', error);
        return null;
      }
      
      return data;
    } catch (error) {
      console.error('Error in updateCampaignClientStatus:', error);
      return null;
    }
  },
  
  async getClients(): Promise<Client[]> {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching clients:', error);
        return [];
      }
      
      return data || [];
    } catch (error) {
      console.error('Error in getClients:', error);
      return [];
    }
  },
  
  async getClientById(clientId: number): Promise<Client | null> {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('id', clientId)
        .single();
      
      if (error) {
        console.error('Error fetching client:', error);
        return null;
      }
      
      return data || null;
    } catch (error) {
      console.error('Error in getClientById:', error);
      return null;
    }
  },
  
  async createClient(client: Omit<Client, 'id' | 'created_at'>): Promise<Client | null> {
    try {
      const { data, error } = await supabase
        .from('clients')
        .insert([client])
        .select()
        .single();
      
      if (error) {
        console.error('Error creating client:', error);
        return null;
      }
      
      return data;
    } catch (error) {
      console.error('Error in createClient:', error);
      return null;
    }
  },
  
  async updateClient(clientId: number, updates: Partial<Client>): Promise<Client | null> {
    try {
      const { data, error } = await supabase
        .from('clients')
        .update(updates)
        .eq('id', clientId)
        .select()
        .single();
      
      if (error) {
        console.error('Error updating client:', error);
        return null;
      }
      
      return data || null;
    } catch (error) {
      console.error('Error in updateClient:', error);
      return null;
    }
  },
  
  async deleteClient(clientId: number): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', clientId);
      
      if (error) {
        console.error('Error deleting client:', error);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Error in deleteClient:', error);
      return false;
    }
  },
  
  async getClientStats(): Promise<{ totalClients: number; activeClients: number }> {
    try {
      const { count: totalClients, error: totalClientsError } = await supabase
        .from('clients')
        .select('*', { count: 'exact', head: true });
      
      if (totalClientsError) {
        console.error('Error fetching total clients count:', totalClientsError);
      }
      
      const { count: activeClients, error: activeClientsError } = await supabase
        .from('clients')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');
      
      if (activeClientsError) {
        console.error('Error fetching active clients count:', activeClientsError);
      }
      
      return {
        totalClients: totalClients || 0,
        activeClients: activeClients || 0,
      };
    } catch (error) {
      console.error('Error in getClientStats:', error);
      return { totalClients: 0, activeClients: 0 };
    }
  },
  
  async getAllCampaignsWithClients(): Promise<
    {
      id: number;
      name: string;
      status: 'draft' | 'active' | 'paused' | 'completed' | 'stopped';
      total_calls: number;
      answered_calls: number;
      start_date: string | null;
      end_date: string | null;
      created_at?: string;
      clients: Client[];
    }[]
  > {
    try {
      const { data: campaigns, error: campaignsError } = await supabase
        .from('campaigns')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (campaignsError) {
        console.error('Error fetching campaigns:', campaignsError);
        return [];
      }
      
      if (!campaigns || campaigns.length === 0) {
        return [];
      }
      
      const { data: clients, error: clientsError } = await supabase
        .from('clients')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (clientsError) {
        console.error('Error fetching clients:', clientsError);
        return [];
      }
      
      if (!clients || clients.length === 0) {
        return campaigns.map(campaign => ({
          ...campaign,
          clients: []
        }));
      }
      
      // Set default values for any undefined fields
      const processedCampaigns = campaigns.map(campaign => ({
        ...campaign,
        name: campaign.name || 'Untitled Campaign'
      }));
      
      const processedClients = clients.map(client => ({
        ...client,
        name: client.name || 'Unknown Client',
        phone: client.phone || 'No Phone',
        email: client.email || 'No Email'
      }));
      
      const campaignsWithClients = processedCampaigns.map((campaign) => ({
        ...campaign,
        clients: processedClients.filter((client) =>
          campaign.id === client.id
        ) || [],
      }));
      
      return campaignsWithClients;
    } catch (error) {
      console.error('Error in getAllCampaignsWithClients:', error);
      return [];
    }
  },
  
  async getAnalyticsData(): Promise<AnalyticsData> {
    try {
      // Check if the calls table exists before querying
      const { data: tableExists } = await supabase
        .from('pg_tables')
        .select('tablename')
        .eq('tablename', 'calls')
        .single();
        
      // If calls table doesn't exist, return mock data
      if (!tableExists) {
        console.log('Calls table does not exist, returning mock analytics data');
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
      
      // Get campaign data for analytics (this would typically pull from the calls table)
      const { data: campaignData, error: campaignError } = await supabase
        .from('campaigns')
        .select('*')
        .limit(5);
        
      if (campaignError) {
        console.error('Error fetching campaign data for analytics:', campaignError);
        throw campaignError;
      }
      
      // Format the data for display
      const formattedCallsData = campaignData?.map(campaign => ({
        name: campaign.name || 'Untitled',
        calls: campaign.total_calls || 0,
        cost: Math.round(Math.random() * 100) // Mock cost data
      })) || [];
      
      const formattedCampaignData = campaignData?.map(campaign => ({
        name: campaign.name || 'Untitled',
        value: campaign.answered_calls || 0
      })) || [];
      
      return {
        totalCalls: campaignData?.reduce((sum, campaign) => sum + (campaign.total_calls || 0), 0) || 0,
        callsChangePercentage: 5, // Mock percentage
        avgCallDuration: '2:30', // Mock duration
        durationChangePercentage: 10, // Mock percentage
        conversionRate: 25, // Mock percentage
        conversionChangePercentage: 2, // Mock percentage
        callsData: formattedCallsData,
        campaignData: formattedCampaignData
      };
    } catch (error) {
      console.error('Error fetching analytics data:', error);
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
  
  async getCallHistory(): Promise<CallHistoryItem[]> {
    try {
      // Check if the calls table exists before querying
      const { data: tableExists } = await supabase
        .from('pg_tables')
        .select('tablename')
        .eq('tablename', 'calls')
        .single();
        
      // If calls table doesn't exist, return empty array
      if (!tableExists) {
        console.log('Calls table does not exist, returning empty call history');
        return [];
      }
      
      // Attempt to get call history from calls table
      const { data: calls, error } = await supabase
        .from('calls')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (error) {
        console.error('Error fetching call history:', error);
        // If there's an error (like table doesn't exist), return empty array
        return [];
      }
      
      // If no call data is available, return empty array
      if (!calls || calls.length === 0) {
        return [];
      }
      
      // Process and format the call data
      const callHistory = calls.map(call => ({
        id: call.id,
        clientName: call.client_name || 'Unknown Client',
        phone: call.phone || 'No Phone',
        campaign: call.campaign_name || 'Unknown Campaign',
        date: new Date(call.created_at).toLocaleDateString(),
        time: new Date(call.created_at).toLocaleTimeString(),
        duration: call.duration ? `${Math.floor(call.duration / 60)}:${(call.duration % 60).toString().padStart(2, '0')}` : '0:00',
        status: call.status || 'Unknown',
        outcome: call.outcome || 'N/A',
        notes: call.notes
      }));
      
      return callHistory;
    } catch (error) {
      console.error('Error in getCallHistory:', error);
      return [];
    }
  }
};
