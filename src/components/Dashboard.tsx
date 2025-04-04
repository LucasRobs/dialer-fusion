import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Users, 
  Phone, 
  Brain, 
  BarChart3, 
  Clock,
  Zap,
  PhoneOff,
  ArrowRight
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { webhookService } from '@/services/webhookService';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

const Dashboard = () => {
  // Get auth context to access user ID
  const { user } = useAuth();
  
  // State for creating a virtual assistant
  const [assistantName, setAssistantName] = useState('');
  const [firstMessage, setFirstMessage] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Dashboard stats
  const stats = {
    totalClients: 1250,
    activeClients: 876,
    recentCalls: 342,
    avgCallDuration: '2:45',
    callsToday: 124,
    completionRate: '87%',
  };

  // Active campaign details
  const campaignStatus = {
    active: true,
    name: "Summer Promotion 2023",
    progress: 60,
    startTime: "09:30 AM",
    callsMade: 342,
    callsRemaining: 228,
  };

  // Handle creating a virtual assistant
  const handleCreateAssistant = async () => {
    if (!user?.id) {
      toast.error("Você precisa estar logado para criar um assistente");
      return;
    }
    
    setIsSubmitting(true);
    try {
      await webhookService.createAssistant({
        name: assistantName,
        first_message: firstMessage,
        system_prompt: systemPrompt,
        userId: user.id
      });

      toast.success('Assistente criado com sucesso!');
      setAssistantName('');
      setFirstMessage('');
      setSystemPrompt('');
    } catch (error) {
      console.error('Erro ao criar assistente:', error);
      toast.error('Erro ao criar assistente. Verifique os logs para mais detalhes.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle making a call
  const handleMakeCall = async () => {
    try {
      const response = await webhookService.makeCall(1, '+5511999999999', 123); // Replace with real values

      if (response.success) {
        toast.success('Ligação iniciada com sucesso!');
      } else {
        toast.error(`Erro ao iniciar ligação: ${response.message}`);
      }
    } catch (error) {
      console.error('Erro ao iniciar ligação:', error);
      toast.error('Erro ao iniciar ligação. Verifique os logs para mais detalhes.');
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
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

      {/* Form to Create Assistant */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Create Virtual Assistant</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <label htmlFor="assistantName" className="block text-sm font-medium">
                Assistant Name
              </label>
              <input
                id="assistantName"
                type="text"
                value={assistantName}
                onChange={(e) => setAssistantName(e.target.value)}
                className="mt-1 block w-full border rounded-md p-2"
                placeholder="Ex: Sales Assistant"
              />
            </div>
            <div>
              <label htmlFor="firstMessage" className="block text-sm font-medium">
                First Message
              </label>
              <textarea
                id="firstMessage"
                value={firstMessage}
                onChange={(e) => setFirstMessage(e.target.value)}
                className="mt-1 block w-full border rounded-md p-2"
                placeholder="Ex: Hello! How can I assist you today?"
              />
            </div>
            <div>
              <label htmlFor="systemPrompt" className="block text-sm font-medium">
                System Prompt
              </label>
              <textarea
                id="systemPrompt"
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                className="mt-1 block w-full border rounded-md p-2"
                placeholder="Ex: You are a virtual assistant that helps customers with inquiries."
              />
            </div>
            <Button
              onClick={handleCreateAssistant}
              disabled={isSubmitting}
              className="w-full"
            >
              {isSubmitting ? 'Creating Assistant...' : 'Create Assistant'}
            </Button>
          </div>
        </CardContent>
      </Card>

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
    </div>
  );
};

export default Dashboard;