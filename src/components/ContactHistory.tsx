
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Phone, Clock, Calendar, CheckCircle, XCircle, AlertCircle, User, PhoneCall } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';

interface Call {
  id: string;
  client_name: string;
  client_phone: string;
  call_start: string;
  call_end?: string;
  duration?: number;
  status: string;
  call_summary?: string;
  recording_url?: string;
  assistant_id?: string;
  campaign_id?: number;
}

const ContactHistory = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [calls, setCalls] = useState<Call[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  
  useEffect(() => {
    const fetchCallHistory = async () => {
      try {
        setIsLoading(true);
        
        // Try to get calls from the calls table first
        const { data: callsData, error: callsError } = await supabase
          .from('calls')
          .select('*, clients(name, phone)')
          .order('call_start', { ascending: false });
        
        if (callsError) {
          console.info('Calls table does not exist, returning empty call history');
          setIsLoading(false);
          return;
        }
        
        // Format the data for display
        const formattedCalls: Call[] = callsData?.map((call) => ({
          id: call.id,
          client_name: call.clients?.name || 'Unknown Client',
          client_phone: call.clients?.phone || 'No Phone',
          call_start: call.call_start,
          call_end: call.call_end,
          duration: call.duration,
          status: call.status || 'unknown',
          call_summary: call.call_summary,
          recording_url: call.recording_url,
          assistant_id: call.assistant_id,
          campaign_id: call.campaign_id
        })) || [];
        
        setCalls(formattedCalls);
      } catch (error) {
        console.error('Error fetching call history:', error);
        toast({
          title: "Error fetching call history",
          description: "An error occurred while fetching call history.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    if (user) {
      fetchCallHistory();
    }
  }, [user, toast]);
  
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'bg-green-500/80';
      case 'answered':
        return 'bg-green-500/80';
      case 'in-progress':
      case 'active':
      case 'initiated':
        return 'bg-blue-500/80';
      case 'failed':
      case 'no-answer':
        return 'bg-red-500/80';
      case 'scheduled':
        return 'bg-yellow-500/80';
      default:
        return 'bg-gray-500/80';
    }
  };
  
  const formatDuration = (seconds?: number) => {
    if (!seconds) return 'N/A';
    
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };
  
  const formatDateTime = (dateString?: string) => {
    if (!dateString) return 'N/A';
    
    try {
      const date = new Date(dateString);
      return format(date, "dd 'de' MMMM, yyyy 'às' HH:mm", { locale: ptBR });
    } catch (error) {
      return 'Invalid date';
    }
  };
  
  const filteredCalls = filter === 'all' 
    ? calls 
    : calls.filter(call => call.status.toLowerCase() === filter.toLowerCase());
  
  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
      case 'answered':
        return <CheckCircle size={16} className="text-green-500" />;
      case 'in-progress':
      case 'active':
      case 'initiated':
        return <Phone size={16} className="text-blue-500" />;
      case 'failed':
      case 'no-answer':
        return <XCircle size={16} className="text-red-500" />;
      case 'scheduled':
        return <Calendar size={16} className="text-yellow-500" />;
      default:
        return <AlertCircle size={16} className="text-gray-500" />;
    }
  };
  
  return (
    <div className="container mx-auto p-4 max-w-7xl">
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">Historical de Contatos</h1>
            <p className="text-muted-foreground">
              Visualize o histórico completo de ligações realizadas pelo seu assistente AI.
            </p>
          </div>
          
          <div className="flex gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  Filtrar
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setFilter('all')}>
                  Todas as ligações
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilter('completed')}>
                  Completadas
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilter('initiated')}>
                  Em andamento
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilter('failed')}>
                  Falhas
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        
        <Tabs defaultValue="list" className="w-full">
          <TabsList className="w-full md:w-auto">
            <TabsTrigger value="list" className="flex-1">Lista</TabsTrigger>
            <TabsTrigger value="stats" className="flex-1">Estatísticas</TabsTrigger>
          </TabsList>
          
          <TabsContent value="list">
            {isLoading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              </div>
            ) : filteredCalls.length > 0 ? (
              <div className="space-y-4">
                {filteredCalls.map((call) => (
                  <Card key={call.id} className="overflow-hidden">
                    <div className={`h-1.5 ${getStatusColor(call.status)}`}></div>
                    <CardHeader className="pb-2">
                      <div className="flex justify-between">
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            <User size={18} className="text-muted-foreground" />
                            {call.client_name}
                          </CardTitle>
                          <CardDescription className="flex items-center gap-2 mt-1">
                            <Phone size={16} className="text-muted-foreground" />
                            {call.client_phone}
                          </CardDescription>
                        </div>
                        <div className={`px-2 py-1 rounded flex items-center gap-1 text-xs text-white ${getStatusColor(call.status)}`}>
                          {getStatusIcon(call.status)}
                          <span>{call.status.charAt(0).toUpperCase() + call.status.slice(1)}</span>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Calendar size={16} />
                            <span>{formatDateTime(call.call_start)}</span>
                          </div>
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Clock size={16} />
                            <span>Duração: {formatDuration(call.duration)}</span>
                          </div>
                          {call.campaign_id && (
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <PhoneCall size={16} />
                              <span>Campanha ID: {call.campaign_id}</span>
                            </div>
                          )}
                        </div>
                        
                        {call.call_summary && (
                          <div className="mt-3 pt-3 border-t">
                            <p className="text-sm font-medium mb-1">Resumo da ligação:</p>
                            <p className="text-sm text-muted-foreground">{call.call_summary}</p>
                          </div>
                        )}
                        
                        {call.recording_url && (
                          <div className="mt-3">
                            <p className="text-sm font-medium mb-2">Gravação:</p>
                            <audio controls className="w-full">
                              <source src={call.recording_url} type="audio/mp3" />
                              Your browser does not support the audio element.
                            </audio>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-10">
                  <PhoneCall size={48} className="text-muted-foreground mb-4" />
                  <h3 className="text-xl font-semibold mb-2">Nenhuma ligação encontrada</h3>
                  <p className="text-muted-foreground text-center">
                    {filter === 'all' 
                      ? 'Não há histórico de ligações. Comece criando uma campanha.'
                      : `Não há ligações com o status "${filter}".`}
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
          
          <TabsContent value="stats">
            <Card>
              <CardHeader>
                <CardTitle>Estatísticas de Ligações</CardTitle>
                <CardDescription>Visualize o desempenho das suas campanhas de ligações</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-8">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Total de ligações:</span>
                      <span className="font-medium">{calls.length}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Ligações completadas:</span>
                      <span className="font-medium">
                        {calls.filter(c => c.status.toLowerCase() === 'completed' || c.status.toLowerCase() === 'answered').length}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Ligações em andamento:</span>
                      <span className="font-medium">
                        {calls.filter(c => 
                          c.status.toLowerCase() === 'in-progress' || 
                          c.status.toLowerCase() === 'active' || 
                          c.status.toLowerCase() === 'initiated').length}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Ligações falhas:</span>
                      <span className="font-medium">
                        {calls.filter(c => c.status.toLowerCase() === 'failed' || c.status.toLowerCase() === 'no-answer').length}
                      </span>
                    </div>
                  </div>
                  
                  <div className="space-y-6">
                    <div>
                      <div className="flex justify-between mb-1 text-sm">
                        <span>Taxa de sucesso</span>
                        <span>
                          {calls.length > 0
                            ? Math.round((calls.filter(c => 
                                c.status.toLowerCase() === 'completed' || 
                                c.status.toLowerCase() === 'answered').length / calls.length) * 100)
                            : 0}%
                        </span>
                      </div>
                      <Progress 
                        value={calls.length > 0
                          ? (calls.filter(c => 
                              c.status.toLowerCase() === 'completed' || 
                              c.status.toLowerCase() === 'answered').length / calls.length) * 100
                          : 0} 
                        className="h-2"
                      />
                    </div>
                    
                    <div>
                      <div className="flex justify-between mb-1 text-sm">
                        <span>Duração média (segundos)</span>
                        <span>
                          {calls.length > 0
                            ? Math.round(calls.reduce((sum, call) => sum + (call.duration || 0), 0) / calls.length)
                            : 0}
                        </span>
                      </div>
                      <Progress 
                        value={100} 
                        className="h-2"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ContactHistory;
