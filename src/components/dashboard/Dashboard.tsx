
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Users, Phone, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import DashboardHeader from './DashboardHeader';
import ActiveCampaign from './ActiveCampaign';
import StatsGrid from './StatsGrid';
import QuickActions from './QuickActions';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';

const Dashboard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // State for user data
  const [stats, setStats] = useState({
    totalClients: 0,
    activeClients: 0,
    recentCalls: 0,
    avgCallDuration: '0:00',
    callsToday: 0,
    completionRate: '0%',
  });

  const [campaignStatus, setCampaignStatus] = useState({
    active: false,
    name: "",
    progress: 0,
    startTime: "",
    callsMade: 0,
    callsRemaining: 0,
    id: null
  });
  
  const [userProfile, setUserProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch user data
  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) return;
      
      try {
        setIsLoading(true);
        
        // Fetch user profile
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
          
        if (profileError) throw profileError;
        setUserProfile(profileData);
        
        // Fetch active campaign if exists
        const { data: campaignData, error: campaignError } = await supabase
          .from('campaigns')
          .select('*')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(1)
          .single();
          
        if (!campaignError && campaignData) {
          // Calculate progress
          const totalCalls = campaignData.total_calls || 0;
          const answeredCalls = campaignData.answered_calls || 0;
          const progress = totalCalls > 0 ? Math.round((answeredCalls / totalCalls) * 100) : 0;
          const remaining = totalCalls - answeredCalls;
          
          setCampaignStatus({
            active: true,
            name: campaignData.name || "Unnamed Campaign",
            progress: progress,
            startTime: campaignData.start_date 
              ? new Date(campaignData.start_date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
              : "N/A",
            callsMade: answeredCalls,
            callsRemaining: remaining,
            id: campaignData.id
          });
        }
        
        // Fetch dashboard stats
        // For now, we'll set some initial values based on campaign data
        if (campaignData) {
          // Actual stats based on user's data
          setStats({
            totalClients: campaignData.total_calls || 0,
            activeClients: Math.round((campaignData.total_calls || 0) * 0.7), // Example calculation
            recentCalls: campaignData.answered_calls || 0,
            avgCallDuration: campaignData.average_duration 
              ? `${Math.floor(campaignData.average_duration / 60)}:${(campaignData.average_duration % 60).toString().padStart(2, '0')}`
              : '0:00',
            callsToday: Math.min(campaignData.answered_calls || 0, 100), // Example calculation
            completionRate: `${progress}%`,
          });
        } else {
          // Default stats for new users
          setStats({
            totalClients: 0,
            activeClients: 0,
            recentCalls: 0,
            avgCallDuration: '0:00',
            callsToday: 0,
            completionRate: '0%',
          });
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
        toast({
          title: "Error loading data",
          description: "Failed to load your dashboard data.",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchUserData();
  }, [user, toast]);

  const handleCampaignStopped = async () => {
    if (!campaignStatus.id) return;
    
    try {
      // Update campaign status in the database
      const { error } = await supabase
        .from('campaigns')
        .update({ status: 'stopped', end_date: new Date().toISOString() })
        .eq('id', campaignStatus.id);
        
      if (error) throw error;
      
      setCampaignStatus(prev => ({
        ...prev,
        active: false
      }));
      
      // Refresh stats after stopping campaign
      setStats(prev => ({
        ...prev,
        completionRate: `${campaignStatus.progress}%`
      }));
    } catch (error) {
      console.error('Error updating campaign status:', error);
      toast({
        title: "Error",
        description: "Failed to update campaign status in the database.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <DashboardHeader userName={userProfile?.first_name || 'User'} />
      
      {/* Active Campaign Section */}
      {isLoading ? (
        <div className="animate-pulse h-40 bg-muted rounded-lg mb-8"></div>
      ) : campaignStatus.active && (
        <ActiveCampaign 
          campaign={campaignStatus} 
          onCampaignStopped={handleCampaignStopped}
        />
      )}

      {/* Stats Grid */}
      {isLoading ? (
        <div className="animate-pulse grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="h-40 bg-muted rounded-lg"></div>
          <div className="h-40 bg-muted rounded-lg"></div>
          <div className="h-40 bg-muted rounded-lg"></div>
        </div>
      ) : (
        <StatsGrid stats={stats} />
      )}

      {/* Quick Actions */}
      <h2 className="text-2xl font-bold mb-4">Quick Actions</h2>
      <QuickActions />
    </div>
  );
};

export default Dashboard;
