
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { ArrowPathIcon, CheckCircleIcon, ExclamationCircleIcon, PhoneIcon } from 'lucide-react';
import { webhookService, WebhookData } from '@/services/webhookService';

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
  const { toast } = useToast();
  
  // Função para carregar os dados
  const loadData = async () => {
    setLoading(true);
    try {
      // Busca status do workflow
      const status = await webhookService.getN8nWorkflowStatus();
      setWorkflowStatus(status);
      
      // Busca logs recentes
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
  
  // Carrega dados ao montar o componente
  useEffect(() => {
    loadData();
    
    // Configura atualização periódica
    const interval = setInterval(loadData, refreshInterval);
    
    // Limpa o intervalo ao desmontar
    return () => clearInterval(interval);
  }, [refreshInterval]);
  
  // Função para testar o webhook manualmente
  const testWebhook = async () => {
    try {
      const testData: Omit<WebhookData, 'timestamp'> = {
        action: 'test_call',
        campaign_id: campaignId,
        additional_data: {
          source: 'manual_test',
          user_interface: 'WorkflowStatus'
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
      
      // Recarrega os dados
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
  
  // Calcula a porcentagem de progresso
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
        {/* Progresso da automação */}
        {workflowStatus.totalTasks > 0 && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progresso</span>
              <span>{progressPercentage}% ({workflowStatus.completedTasks}/{workflowStatus.totalTasks})</span>
            </div>
            <Progress value={progressPercentage} className="h-2" />
          </div>
        )}
        
        {/* Estatísticas rápidas */}
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
        
        {/* Logs recentes */}
        {logs.length > 0 && (
          <div className="pt-2">
            <h3 className="text-sm font-medium mb-2">Atividade Recente</h3>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {logs.map((log, index) => (
                <div key={index} className="flex items-start gap-2 text-sm border-b pb-2">
                  {log.success ? (
                    <CheckCircleIcon className="w-4 h-4 text-green-500 mt-0.5" />
                  ) : (
                    <ExclamationCircleIcon className="w-4 h-4 text-red-500 mt-0.5" />
                  )}
                  <div>
                    <div className="font-medium">{log.action || 'Ação do Webhook'}</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(log.created_at).toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
      
      <CardFooter className="gap-2 justify-between flex-wrap">
        <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
          <ArrowPathIcon className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
        <Button size="sm" onClick={testWebhook} disabled={loading}>
          <PhoneIcon className="h-4 w-4 mr-2" />
          Testar Integração
        </Button>
      </CardFooter>
    </Card>
  );
};

export default WorkflowStatus;
