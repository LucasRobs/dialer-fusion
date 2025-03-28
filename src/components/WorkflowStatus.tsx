import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { RotateCw, CheckCircle, AlertCircle, Phone, Settings, Info } from 'lucide-react';
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
    assistantId: "" // Will be populated from localStorage if available
  });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { toast } = useToast();
  
  const loadData = async () => {
    if (!campaignId) {
      return;
    }
    
    setLoading(true);
    try {
      setWorkflowStatus({
        status: 'idle',
        completedTasks: 0,
        totalTasks: 0,
        lastUpdated: new Date().toISOString()
      });
      
      setLogs([]);
    } catch (error) {
      console.error('Erro ao carregar dados de status:', error);
      toast({
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
      let assistantName = "Default Assistant";
      
      try {
        const storedAssistant = localStorage.getItem('selected_assistant');
        if (storedAssistant) {
          const assistantData = JSON.parse(storedAssistant);
          if (assistantData && assistantData.name) {
            assistantName = assistantData.name;
            console.log('Using stored assistant name for test call:', assistantName);
          }
        }
      } catch (e) {
        console.error('Error parsing stored assistant data:', e);
      }
      
      const testData: Omit<WebhookData, 'timestamp'> = {
        action: 'test_call',
        campaign_id: campaignId,
        client_name: "Cliente Teste",
        client_phone: "+5511999999999",
        additional_data: {
          source: 'manual_test',
          user_interface: 'WorkflowStatus',
          assistant_name: assistantName
        }
      };
      
      const result = await webhookService.triggerCallWebhook(testData);
      
      if (result.success) {
        toast({
          description: `O teste de ligação foi enviado com sucesso usando o assistente "${assistantName}".`,
          variant: "default"
        });
      } else {
        toast({
          description: "Não foi possível completar o teste. Verifique os logs.",
          variant: "destructive"
        });
      }
      
      await loadData();
    } catch (error) {
      console.error('Erro ao testar webhook:', error);
      toast({
        description: "Ocorreu um erro ao tentar testar a ligação.",
        variant: "destructive"
      });
    }
  };
  
  const saveVapiSettings = () => {
    localStorage.setItem('vapi_settings', JSON.stringify(vapiSettings));
    toast({
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
          callerId: parsed.callerId || prev.callerId
        }));
      } catch (e) {
        console.error("Erro ao carregar configurações Vapi:", e);
      }
    }
    
    const storedAssistant = localStorage.getItem('vapi_assistant');
    if (storedAssistant) {
      try {
        const assistantData = JSON.parse(storedAssistant);
        if (assistantData && assistantData.id) {
          setVapiSettings(prev => ({
            ...prev,
            assistantId: assistantData.id
          }));
        }
      } catch (e) {
        console.error("Erro ao carregar dados do assistente:", e);
      }
    }
  }, []);

  const renderEmptyState = () => (
    <div className="py-8 text-center space-y-4">
      <Info className="h-12 w-12 mx-auto text-muted-foreground" />
      <div className="space-y-2">
        <h3 className="font-medium text-lg">Nenhuma automação ativa</h3>
        <p className="text-muted-foreground max-w-md mx-auto">
          Quando você iniciar uma campanha, as informações de status serão exibidas aqui.
        </p>
      </div>
    </div>
  );
  
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
                value={vapiSettings.assistantId || "Assistente personalizado será usado. Crie um na aba de AI Training"}
                onChange={(e) => setVapiSettings({...vapiSettings, assistantId: e.target.value})}
                readOnly
              />
              {vapiSettings.assistantId ? (
                <p className="text-xs text-secondary">Você está usando um assistente personalizado.</p>
              ) : (
                <p className="text-xs text-muted-foreground">Crie um assistente personalizado na aba AI Training.</p>
              )}
            </div>
            
            <Button size="sm" onClick={saveVapiSettings}>Salvar Configurações</Button>
          </div>
        )}
        
        {renderEmptyState()}
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
