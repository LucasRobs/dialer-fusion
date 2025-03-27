
import React from 'react';
import { Link } from 'react-router-dom';
import { Users, Phone, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import DashboardHeader from './DashboardHeader';
import ActiveCampaign from './ActiveCampaign';
import StatsGrid from './StatsGrid';
import QuickActions from './QuickActions';

const Dashboard = () => {
  // Dummy data for dashboard stats
  const stats = {
    totalClients: 1250,
    activeClients: 876,
    recentCalls: 342,
    avgCallDuration: '2:45',
    callsToday: 124,
    completionRate: '87%',
  };

  const campaignStatus = {
    active: true,
    name: "Summer Promotion 2023",
    progress: 60,
    startTime: "09:30 AM",
    callsMade: 342,
    callsRemaining: 228,
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <DashboardHeader />
      
      {/* Active Campaign Section */}
      {campaignStatus.active && (
        <ActiveCampaign campaign={campaignStatus} />
      )}

      {/* Stats Grid */}
      <StatsGrid stats={stats} />

      {/* Quick Actions */}
      <h2 className="text-2xl font-bold mb-4">Quick Actions</h2>
      <QuickActions />
    </div>
  );
};

export default Dashboard;
