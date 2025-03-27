import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { RotateCw, CheckCircle, AlertCircle, Phone, Settings } from 'lucide-react';
import { webhookService, WebhookData } from '@/services/webhookService';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface WorkflowStatusProps {
  campaignId?: number;
  refreshInterval?: number; // em milissegundos
}

const WorkflowStatus: React.FC<WorkflowStatusProps> = ({
  campaignId,
  refreshInterval = 30000 // 30 segundos por padrão
}) => {
  const [workflowStatus, setWorkflowStatus] = useState<{
    status: 'idle' | 'running' | 'completed' | 'failed';
    completedTasks: number;
    totalTasks: number;
    lastUpdated: string;
  }>({
    status: 'idle',
    completedTasks: 0,
    totalTasks: 0,
    lastUpdated: new Date().toISOString()
  });
  
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [vapiSettings, setVapiSettings] = useState({
    callerId: "97141b30-c5bc-4234-babb-d38b79452e2a", // Default Vapi caller ID
    apiKey: "",
    assistantId: "01646bac-c486-455b-bbc4-a2bc5a1da47c" // Default assistant ID
  });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { toast } = useToast();
  
  const loadData = async () => {
    setLoading(true);
    try {
      const status = await webhookService.getN8nWorkflowStatus();
      setWorkflowStatus({
        status: status.status as 'idle' | 'running' | 'completed' | 'failed',
        completedTasks: status.completedTasks,
        totalTasks: status.totalTasks,
        lastUpdated: status.lastUpdated
      });
      
      const recentLogs = await webhookService.getWebhookLogs(5);
      setLogs(recentLogs || []);
    } catch (error) {
      console.error('Erro ao carregar dados de status:', error);
      toast({
        title: "Erro ao carregar status",
        description: "Não foi possível obter as informações mais recentes do workflow.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    loadData();
    
    const interval = setInterval(loadData, refreshInterval);
    
    return () => clearInterval(interval);
  }, [refreshInterval]);
  
  const testWebhook = async () => {
    try {
      const testData: Omit<WebhookData, 'timestamp'> = {
        action: 'test_call',
        campaign_id: campaignId,
        client_name: "Cliente Teste",
        client_phone: "+5511999999999",
        additional_data: {
          source: 'manual_test',
          user_interface: 'WorkflowStatus',
          vapi_caller_id: vapiSettings.callerId,
          vapi_assistant_id: vapiSettings.assistantId
        }
      };
      
      const result = await webhookService.triggerCallWebhook(testData);
      
      if (result.success) {
        toast({
          title: "Webhook disparado com sucesso",
          description: "O teste de integração foi enviado com sucesso.",
          variant: "default"
        });
      } else {
        toast({
          title: "Erro no teste de webhook",
          description: "Não foi possível completar o teste. Verifique os logs.",
          variant: "destructive"
        });
      }
      
      await loadData();
    } catch (error) {
      console.error('Erro ao testar webhook:', error);
      toast({
        title: "Erro no teste",
        description: "Ocorreu um erro ao tentar testar o webhook.",
        variant: "destructive"
      });
    }
  };
  
  const saveVapiSettings = () => {
    localStorage.setItem('vapi_settings', JSON.stringify(vapiSettings));
    toast({
      title: "Configurações Salvas",
      description: "As configurações da Vapi foram salvas com sucesso.",
    });
    setSettingsOpen(false);
  };
  
  useEffect(() => {
    const savedSettings = localStorage.getItem('vapi_settings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setVapiSettings(prev => ({
          ...parsed,
          callerId: parsed.callerId || prev.callerId,
          assistantId: parsed.assistantId || prev.assistantId
        }));
      } catch (e) {
        console.error("Erro ao carregar configurações Vapi:", e);
      }
    }
  }, []);
  
  const progressPercentage = workflowStatus.totalTasks > 0
    ? Math.round((workflowStatus.completedTasks / workflowStatus.totalTasks) * 100)
    : 0;
  
  return (
    <Card className="shadow-md">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-xl">Status da Automação</CardTitle>
            <CardDescription>
              Última atualização: {new Date(workflowStatus.lastUpdated).toLocaleString()}
            </CardDescription>
          </div>
          <Badge
            variant={
              workflowStatus.status === 'running' ? 'secondary' :
              workflowStatus.status === 'completed' ? 'default' :
              workflowStatus.status === 'failed' ? 'destructive' : 'outline'
            }
            className="capitalize"
          >
            {workflowStatus.status === 'running' ? 'Em execução' :
             workflowStatus.status === 'completed' ? 'Concluído' :
             workflowStatus.status === 'failed' ? 'Falha' : 'Inativo'}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {workflowStatus.totalTasks > 0 && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progresso</span>
              <span>{progressPercentage}% ({workflowStatus.completedTasks}/{workflowStatus.totalTasks})</span>
            </div>
            <Progress value={progressPercentage} className="h-2" />
          </div>
        )}
        
        {settingsOpen && (
          <div className="bg-muted/30 p-3 rounded-md space-y-3">
            <h3 className="font-medium mb-2">Configurações da Vapi</h3>
            
            <div className="space-y-2">
              <Label htmlFor="callerId">Número de Telefone (ID do Chamador)</Label>
              <Input
                id="callerId"
                placeholder="+55119999999999"
                value={vapiSettings.callerId}
                onChange={(e) => setVapiSettings({...vapiSettings, callerId: e.target.value})}
                readOnly
              />
              <p className="text-xs text-muted-foreground">ID do chamador configurado: 97141b30-c5bc-4234-babb-d38b79452e2a</p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="apiKey">API Key da Vapi (opcional)</Label>
              <Input
                id="apiKey"
                type="password"
                placeholder="sk_vapi_..."
                value={vapiSettings.apiKey}
                onChange={(e) => setVapiSettings({...vapiSettings, apiKey: e.target.value})}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="assistantId">ID do Assistente Vapi</Label>
              <Input
                id="assistantId"
                value={vapiSettings.assistantId}
                onChange={(e) => setVapiSettings({...vapiSettings, assistantId: e.target.value})}
                readOnly
              />
              <p className="text-xs text-muted-foreground">ID do assistente configurado: 01646bac-c486-455b-bbc4-a2bc5a1da47c</p>
            </div>
            
            <Button size="sm" onClick={saveVapiSettings}>Salvar Configurações</Button>
          </div>
        )}
        
        <div className="grid grid-cols-2 gap-3 pt-2">
          <div className="bg-muted/30 p-3 rounded-md">
            <div className="text-sm text-muted-foreground">Chamadas Enviadas</div>
            <div className="text-2xl font-semibold">{workflowStatus.completedTasks}</div>
          </div>
          <div className="bg-muted/30 p-3 rounded-md">
            <div className="text-sm text-muted-foreground">Taxa de Sucesso</div>
            <div className="text-2xl font-semibold">
              {workflowStatus.completedTasks > 0 && workflowStatus.totalTasks > 0
                ? Math.round((workflowStatus.completedTasks / workflowStatus.totalTasks) * 100)
                : 0}%
            </div>
          </div>
        </div>
        
        {logs.length > 0 && (
          <div className="pt-2">
            <h3 className="text-sm font-medium mb-2">Atividade Recente</h3>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {logs.map((log, index) => (
                <div key={index} className="flex items-start gap-2 text-sm border-b pb-2">
                  {log.success ? (
                    <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-500 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <div className="font-medium">{log.action || 'Ação do Webhook'}</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(log.created_at).toLocaleString()}
                    </div>
                    {log.request_data?.client_name && (
                      <div className="text-xs">
                        Cliente: {log.request_data.client_name} ({log.request_data.client_phone})
                      </div>
                    )}
                    {log.request_data?.additional_data?.vapi_assistant_id && (
                      <div className="text-xs text-muted-foreground">
                        Assistant ID: {log.request_data.additional_data.vapi_assistant_id.substring(0, 8)}...
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
      
      <CardFooter className="gap-2 justify-between flex-wrap">
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
            <RotateCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
          
          <Button variant="outline" size="sm" onClick={() => setSettingsOpen(!settingsOpen)}>
            <Settings className="h-4 w-4 mr-2" />
            Configurações
          </Button>
        </div>
        
        <Button size="sm" onClick={testWebhook} disabled={loading}>
          <Phone className="h-4 w-4 mr-2" />
          Testar Ligação
        </Button>
      </CardFooter>
    </Card>
  );
};

export default WorkflowStatus;
