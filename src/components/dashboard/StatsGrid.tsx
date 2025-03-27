
import React from 'react';
import { Link } from 'react-router-dom';
import { Users, Phone, BarChart3, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface StatsData {
  totalClients: number;
  activeClients: number;
  recentCalls: number;
  avgCallDuration: string;
  callsToday: number;
  completionRate: string;
}

interface StatsGridProps {
  stats: StatsData;
}

const StatsGrid: React.FC<StatsGridProps> = ({ stats }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      <Card className="card-hover">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-medium flex items-center">
            <Users className="h-5 w-5 mr-2 text-secondary" />
            Client Base
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between items-end">
            <div>
              <div className="text-3xl font-bold">{stats.totalClients}</div>
              <p className="text-sm text-foreground/70">Total Clients</p>
            </div>
            <div className="text-right">
              <div className="text-xl font-semibold text-secondary">{stats.activeClients}</div>
              <p className="text-sm text-foreground/70">Active</p>
            </div>
          </div>
          <Link to="/clients">
            <Button variant="ghost" className="w-full mt-4 text-sm">
              View All Clients
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </Link>
        </CardContent>
      </Card>

      <Card className="card-hover">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-medium flex items-center">
            <Phone className="h-5 w-5 mr-2 text-secondary" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between items-end">
            <div>
              <div className="text-3xl font-bold">{stats.recentCalls}</div>
              <p className="text-sm text-foreground/70">Calls Made</p>
            </div>
            <div className="text-right">
              <div className="text-xl font-semibold">{stats.avgCallDuration}</div>
              <p className="text-sm text-foreground/70">Avg Duration</p>
            </div>
          </div>
          <Link to="/history">
            <Button variant="ghost" className="w-full mt-4 text-sm">
              View Call History
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </Link>
        </CardContent>
      </Card>

      <Card className="card-hover">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-medium flex items-center">
            <BarChart3 className="h-5 w-5 mr-2 text-secondary" />
            Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between items-end">
            <div>
              <div className="text-3xl font-bold">{stats.callsToday}</div>
              <p className="text-sm text-foreground/70">Today's Calls</p>
            </div>
            <div className="text-right">
              <div className="text-xl font-semibold text-secondary">{stats.completionRate}</div>
              <p className="text-sm text-foreground/70">Completion Rate</p>
            </div>
          </div>
          <Link to="/analytics">
            <Button variant="ghost" className="w-full mt-4 text-sm">
              View Analytics
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
};

export default StatsGrid;
