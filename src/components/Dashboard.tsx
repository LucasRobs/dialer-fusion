
import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Users, 
  Phone, 
  Brain, 
  BarChart3, 
  Clock,
  Zap,
  Phone as PhoneIcon,
  PhoneOff,
  ArrowRight
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

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
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Welcome back, User</h1>
          <p className="text-foreground/70">Here's what's happening with your campaigns today.</p>
        </div>
        <div className="mt-4 md:mt-0 flex gap-3">
          <Link to="/clients">
            <Button variant="outline" className="flex items-center gap-2">
              <Users size={16} />
              <span>Add Clients</span>
            </Button>
          </Link>
          <Link to="/campaigns">
            <Button className="flex items-center gap-2">
              <Phone size={16} />
              <span>New Campaign</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Active Campaign Section */}
      {campaignStatus.active && (
        <Card className="mb-8 border-l-4 border-l-secondary">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl flex items-center">
                  <div className="h-3 w-3 rounded-full bg-secondary animate-pulse mr-2"></div>
                  Active Campaign: {campaignStatus.name}
                </CardTitle>
                <p className="text-sm text-foreground/70">Started at {campaignStatus.startTime}</p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="flex items-center gap-1">
                  <PhoneOff size={16} />
                  <span>Stop Campaign</span>
                </Button>
                <Link to="/campaigns">
                  <Button size="sm" className="flex items-center gap-1">
                    <BarChart3 size={16} />
                    <span>View Details</span>
                  </Button>
                </Link>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="w-full h-2 bg-gray-200 rounded-full mt-3">
              <div 
                className="h-full bg-secondary rounded-full transition-all duration-500 ease-in-out"
                style={{ width: `${campaignStatus.progress}%` }}
              ></div>
            </div>
            <div className="flex justify-between mt-2 text-sm text-foreground/70">
              <span>{campaignStatus.callsMade} calls made</span>
              <span>{campaignStatus.callsRemaining} calls remaining</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Grid */}
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

      {/* Quick Actions */}
      <h2 className="text-2xl font-bold mb-4">Quick Actions</h2>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Link to="/clients">
          <Card className="h-full card-hover border-2 border-transparent hover:border-secondary/30">
            <CardContent className="p-6 flex flex-col items-center justify-center text-center">
              <Users className="h-10 w-10 mb-3 text-secondary" />
              <h3 className="font-semibold text-lg mb-1">Manage Clients</h3>
              <p className="text-sm text-foreground/70">Add, edit, or remove clients from your database</p>
            </CardContent>
          </Card>
        </Link>

        <Link to="/training">
          <Card className="h-full card-hover border-2 border-transparent hover:border-secondary/30">
            <CardContent className="p-6 flex flex-col items-center justify-center text-center">
              <Brain className="h-10 w-10 mb-3 text-secondary" />
              <h3 className="font-semibold text-lg mb-1">Train AI Assistant</h3>
              <p className="text-sm text-foreground/70">Customize your AI to match your business needs</p>
            </CardContent>
          </Card>
        </Link>

        <Link to="/campaigns">
          <Card className="h-full card-hover border-2 border-transparent hover:border-secondary/30">
            <CardContent className="p-6 flex flex-col items-center justify-center text-center">
              <Zap className="h-10 w-10 mb-3 text-secondary" />
              <h3 className="font-semibold text-lg mb-1">Start Campaign</h3>
              <p className="text-sm text-foreground/70">Launch a new mass calling campaign</p>
            </CardContent>
          </Card>
        </Link>

        <Link to="/history">
          <Card className="h-full card-hover border-2 border-transparent hover:border-secondary/30">
            <CardContent className="p-6 flex flex-col items-center justify-center text-center">
              <Clock className="h-10 w-10 mb-3 text-secondary" />
              <h3 className="font-semibold text-lg mb-1">Contact History</h3>
              <p className="text-sm text-foreground/70">See detailed history of your client interactions</p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
};

export default Dashboard;
