import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { RotateCw, CheckCircle, AlertCircle, Phone, Settings, Info } from 'lucide-react';
import webhookService from '@/services/webhookService';
import type { WebhookPayload } from '@/services/webhookService';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import assistantService from '@/services/assistantService';

interface WorkflowStatusProps {
  campaignId?: number;
  refreshInterval?: number; // em milissegundos
}

// Opções para modelo e voz
const MODEL_OPTIONS = [
  { value: "gpt-4o-turbo", label: "GPT-4o Turbo" },
  { value: "gpt-4", label: "GPT-4" },
  { value: "gpt-3.5-turbo", label: "GPT-3.5 Turbo" }
];

const VOICE_OPTIONS = [
  { value: "33B4UnXyTNbgLmdEDh5P", label: "Voz PT-BR (ElevenLabs)" },
  { value: "eleven_labs_gemma", label: "ElevenLabs Gemma" },
  { value: "eleven_labs_josh", label: "ElevenLabs Josh" },
  { value: "eleven_labs_rachel", label: "ElevenLabs Rachel" },
  { value: "eleven_labs_domi", label: "ElevenLabs Domi" }
];

const LANGUAGE_OPTIONS = [
  { value: "pt-BR", label: "Português (Brasil)" },
  { value: "en-US", label: "Inglês (EUA)" }
];

const WorkflowStatus: React.FC<WorkflowStatusProps> = ({
  campaignId,
  refreshInterval = 30000 // 30 segundos por padrão
}) => {
  const { user } = useAuth();
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
    apiKey: "494da5a9-4a54-4155-bffb-d7206bd72afd", // Adding API key
    assistantId: "", // Will be populated from localStorage if available
    model: "gpt-4o-turbo", // Modelo padrão
    voice: "33B4UnXyTNbgLmdEDh5P", // Voz padrão PT-BR
    language: "pt-BR" // Idioma padrão
  });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [assistants, setAssistants] = useState<any[]>([]);
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
      
      // Load assistants from Vapi API directly
      try {
        const vapiAssistants = await webhookService.getAssistantsFromVapiApi();
        if (vapiAssistants && vapiAssistants.length > 0) {
          console.log('Assistentes encontrados na API Vapi:', vapiAssistants);
          setAssistants(vapiAssistants);
          
          // Se não tivermos um assistente selecionado, selecione o primeiro
          if (!vapiSettings.assistantId && vapiAssistants.length > 0) {
            setVapiSettings(prev => ({
              ...prev,
              assistantId: vapiAssistants[0].id
            }));
            console.log('Selecionando primeiro assistente da API:', vapiAssistants[0]);
          }
        } else {
          console.log('Nenhum assistente encontrado na API Vapi');
        }
      } catch (error) {
        console.error('Erro ao buscar assistentes da API Vapi:', error);
      }
      
      // Também carrega os assistentes do banco local como backup
      const assistantsResult = await webhookService.getAllAssistants(user?.id || '');
      if (Array.isArray(assistantsResult) && assistantsResult.length > 0) {
        if (assistants.length === 0) {
          setAssistants(assistantsResult);
        }
      }
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
      let assistantId = vapiSettings.assistantId;
      let systemPrompt = "";
      let firstMessage = "";
      
      // Find a valid assistant ID
      if (!assistantId) {
        try {
          // First, try to use the Vapi API assistant
          if (assistants && assistants.length > 0) {
            const firstAssistant = assistants[0];
            assistantName = firstAssistant.name || "Default Assistant";
            assistantId = firstAssistant.id;
            systemPrompt = firstAssistant.system_prompt || "";
            firstMessage = firstAssistant.first_message || "Olá, como posso ajudar?";
            console.log('Using Vapi API assistant for test call:', {
              name: assistantName,
              id: assistantId,
              system_prompt: systemPrompt,
              first_message: firstMessage
            });
          } else {
            // If we don't have a list of assistants, fetch them directly from Vapi
            const vapiAssistants = await assistantService.getVapiAssistants();
            if (vapiAssistants && vapiAssistants.length > 0) {
              assistantName = vapiAssistants[0].name || "Default Assistant";
              assistantId = vapiAssistants[0].id;
              systemPrompt = vapiAssistants[0].system_prompt || "";
              firstMessage = vapiAssistants[0].first_message || "Olá, como posso ajudar?";
              console.log('Fetched and using first Vapi assistant for test call:', {
                name: assistantName,
                id: assistantId,
                system_prompt: systemPrompt,
                first_message: firstMessage
              });
            } else {
              // Try localStorage as last resort
              const storedAssistant = localStorage.getItem('selected_assistant');
              if (storedAssistant) {
                const assistantData = JSON.parse(storedAssistant);
                if (assistantData) {
                  assistantName = assistantData.name || "Default Assistant";
                  // Prioritize assistant_id over id if available
                  assistantId = assistantData.assistant_id || assistantData.id;
                  systemPrompt = assistantData.system_prompt || "";
                  firstMessage = assistantData.first_message || "Olá, como posso ajudar?";
                  
                  // Verify this ID with Vapi API
                  const confirmedId = await assistantService.ensureVapiAssistantId(assistantId);
                  if (confirmedId) {
                    assistantId = confirmedId;
                    // Try to get system_prompt and first_message from Vapi API
                    const assistantDetails = await assistantService.getVapiAssistantById(assistantId);
                    if (assistantDetails) {
                      systemPrompt = assistantDetails.system_prompt || systemPrompt;
                      firstMessage = assistantDetails.first_message || firstMessage;
                    }
                  } else if (assistantData.name) {
                    // Try to find by name if ID verification failed
                    const idByName = await assistantService.getVapiAssistantIdByName(assistantData.name);
                    if (idByName) {
                      assistantId = idByName;
                      // Try to get system_prompt and first_message from Vapi API
                      const assistantDetails = await assistantService.getVapiAssistantById(idByName);
                      if (assistantDetails) {
                        systemPrompt = assistantDetails.system_prompt || systemPrompt;
                        firstMessage = assistantDetails.first_message || firstMessage;
                      }
                      console.log('Found assistant ID by name:', idByName);
                    }
                  }
                  
                  console.log('Using stored assistant for test call:', {
                    name: assistantName,
                    id: assistantId,
                    system_prompt: systemPrompt,
                    first_message: firstMessage
                  });
                }
              }
            }
          }
        } catch (e) {
          console.error('Error getting assistant data:', e);
        }
      } else {
        // Use the assistantId from settings and look for the name
        try {
          // First try to validate this ID directly with the Vapi API
          const assistantDetails = await assistantService.getVapiAssistantById(assistantId);
          if (assistantDetails) {
            assistantName = assistantDetails.name || "Selected Assistant";
            systemPrompt = assistantDetails.system_prompt || "";
            firstMessage = assistantDetails.first_message || "Olá, como posso ajudar?";
            console.log('Validated assistant ID with Vapi API:', {
              name: assistantName,
              id: assistantId,
              system_prompt: systemPrompt,
              first_message: firstMessage
            });
          } else {
            // If direct validation fails, look in our local list
            const matchingAssistant = assistants.find(a => a.id === assistantId);
            if (matchingAssistant) {
              assistantName = matchingAssistant.name || "Selected Assistant";
              systemPrompt = matchingAssistant.system_prompt || "";
              firstMessage = matchingAssistant.first_message || "Olá, como posso ajudar?";
            } else {
              // Try to fetch all assistants and find a match
              const allAssistants = await assistantService.getVapiAssistants();
              const matchingAssistant = allAssistants.find(a => a.id === assistantId);
              if (matchingAssistant) {
                assistantName = matchingAssistant.name || "Selected Assistant";
                systemPrompt = matchingAssistant.system_prompt || "";
                firstMessage = matchingAssistant.first_message || "Olá, como posso ajudar?";
              }
            }
          }
        } catch (e) {
          console.error('Error validating assistant ID:', e);
        }
        
        console.log('Using configured assistant for test call:', {
          name: assistantName,
          id: assistantId,
          system_prompt: systemPrompt,
          first_message: firstMessage
        });
      }
      
      if (!assistantId) {
        console.error('No assistant ID available for test call, trying to find one by name');
        
        // Last attempt - try to find an assistant with a similar name
        if (assistantName && assistantName !== "Default Assistant") {
          try {
            const idByName = await assistantService.getVapiAssistantIdByName(assistantName);
            if (idByName) {
              assistantId = idByName;
              // Try to get system_prompt and first_message from Vapi API
              const assistantDetails = await assistantService.getVapiAssistantById(idByName);
              if (assistantDetails) {
                systemPrompt = assistantDetails.system_prompt || "";
                firstMessage = assistantDetails.first_message || "Olá, como posso ajudar?";
              }
              console.log('Found assistant ID by name as last resort:', idByName);
            }
          } catch (e) {
            console.error('Error finding assistant by name:', e);
          }
        }
        
        if (!assistantId) {
          toast({
            description: "Nenhum assistente disponível. Por favor, selecione ou crie um assistente primeiro.",
            variant: "destructive"
          });
          return;
        }
      }
      
      try {
        const latestDetails = await assistantService.getVapiAssistantById(assistantId);
        if (latestDetails) {
          systemPrompt = latestDetails.system_prompt || systemPrompt;
          firstMessage = latestDetails.first_message || firstMessage || "Olá, como posso ajudar?";
          console.log('Using latest assistant details:', {
            system_prompt: systemPrompt,
            first_message: firstMessage
          });
        }
      } catch (error) {
        console.error('Error fetching latest assistant details:', error);
      }
      
      // Garantir que temos um valor padrão para first_message se ainda estiver vazio
      if (!firstMessage) {
        firstMessage = "Olá, como posso ajudar?";
      }
      
      const testData: WebhookPayload = {
        action: 'test_call',
        campaign_id: campaignId || 0,
        client_name: "Cliente Teste",
        client_phone: "+5511999999999",
        provider: "vapi",
        call: {
          model: {
            provider: "openai",
            model: vapiSettings.model,
            temperature: 0.5,
            systemPrompt: systemPrompt
          },
          voice: {
            provider: "11labs",
            model: "eleven_multilingual_v2",
            voiceId: vapiSettings.voice
          },
          language: vapiSettings.language,
          first_message: firstMessage,
          system_prompt: systemPrompt
        },
        additional_data: {
          source: 'manual_test',
          user_interface: 'WorkflowStatus',
          assistant_name: assistantName,
          caller_id: vapiSettings.callerId,
          api_key: vapiSettings.apiKey,
          assistant_id: null,
          vapi_assistant_id: assistantId,
          first_message: firstMessage,
          system_prompt: systemPrompt,
          model_name: vapiSettings.model
        }
      };
      
      console.log("Sending test webhook payload:", {
        ...testData,
        additional_data: {
          ...testData.additional_data,
          api_key: "***REDACTED***"
        }
      });
      
      const result = await webhookService.triggerCallWebhook(testData);
      
      if (result.success) {
        toast({
          description: `O teste de ligação foi enviado com sucesso usando o assistente "${assistantName}"${assistantId ? ` (ID: ${assistantId.substring(0, 8)}...)` : ''}.`,
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
          ...prev,
          callerId: parsed.callerId || prev.callerId,
          apiKey: parsed.apiKey || "494da5a9-4a54-4155-bffb-d7206bd72afd", // Ensure API key is set
          assistantId: parsed.assistantId || prev.assistantId,
          model: parsed.model || prev.model,
          voice: parsed.voice || "33B4UnXyTNbgLmdEDh5P", // Usar voz PT-BR como padrão
          language: parsed.language || "pt-BR" // Usar PT-BR como padrão
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
  
  useEffect(() => {
    // Carregar assistentes da API Vapi
    const loadVapiAssistants = async () => {
      try {
        const vapiAssistants = await webhookService.getAssistantsFromVapiApi();
        if (vapiAssistants && vapiAssistants.length > 0) {
          console.log('Loaded assistants from Vapi API:', vapiAssistants);
          setAssistants(vapiAssistants);
        }
      } catch (error) {
        console.error('Error loading assistants from Vapi API:', error);
      }
    };
    
    loadVapiAssistants();
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
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="text-xl">Status de Automação</CardTitle>
            <CardDescription>Status das automações em andamento</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => setSettingsOpen(!settingsOpen)}
            >
              <Settings className="h-4 w-4 mr-1" />
              Configurações
            </Button>
            <Button 
              size="sm" 
              onClick={testWebhook}
              disabled={loading}
              className="bg-green-600 hover:bg-green-700"
            >
              <Phone className="h-4 w-4 mr-1" />
              Testar Ligação
            </Button>
          </div>
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
                placeholder="97141b30-c5bc-4234-babb-d38b79452e2a"
                value={vapiSettings.callerId}
                onChange={(e) => setVapiSettings({...vapiSettings, callerId: e.target.value})}
              />
              <p className="text-xs text-muted-foreground">ID do chamador: 97141b30-c5bc-4234-babb-d38b79452e2a</p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="apiKey">API Key da Vapi</Label>
              <Input
                id="apiKey"
                placeholder="494da5a9-4a54-4155-bffb-d7206bd72afd"
                value={vapiSettings.apiKey}
                onChange={(e) => setVapiSettings({...vapiSettings, apiKey: e.target.value})}
              />
              <p className="text-xs text-muted-foreground">API Key padrão: 494da5a9-4a54-4155-bffb-d7206bd72afd</p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="assistantId">Assistente Vapi</Label>
              <Select 
                value={vapiSettings.assistantId} 
                onValueChange={(value) => setVapiSettings({...vapiSettings, assistantId: value})}
              >
                <SelectTrigger id="assistantId">
                  <SelectValue placeholder="Selecione um assistente" />
                </SelectTrigger>
                <SelectContent>
                  {assistants.map((assistant) => (
                    <SelectItem key={assistant.id} value={assistant.id}>
                      {assistant.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {assistants.length === 0 && (
                <p className="text-xs text-muted-foreground">Nenhum assistente encontrado. Use a API key 494da5a9-4a54-4155-bffb-d7206bd72afd.</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="model">Modelo de IA</Label>
              <Select 
                value={vapiSettings.model} 
                onValueChange={(value) => setVapiSettings({...vapiSettings, model: value})}
              >
                <SelectTrigger id="model">
                  <SelectValue placeholder="Selecione um modelo" />
                </SelectTrigger>
                <SelectContent>
                  {MODEL_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="voice">Voz</Label>
              <Select 
                value={vapiSettings.voice} 
                onValueChange={(value) => setVapiSettings({...vapiSettings, voice: value})}
              >
                <SelectTrigger id="voice">
                  <SelectValue placeholder="Selecione uma voz" />
                </SelectTrigger>
                <SelectContent>
                  {VOICE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">A voz PT-BR (ElevenLabs) é recomendada para atendimento em português.</p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="language">Idioma</Label>
              <Select 
                value={vapiSettings.language} 
                onValueChange={(value) => setVapiSettings({...vapiSettings, language: value})}
              >
                <SelectTrigger id="language">
                  <SelectValue placeholder="Selecione um idioma" />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <Button size="sm" onClick={saveVapiSettings}>Salvar Configurações</Button>
          </div>
        )}
        
        {renderEmptyState()}
      </CardContent>
      
      <CardFooter className="gap-2 justify-between flex-wrap">
        <div className="flex items-center gap-2">
          <Badge variant={workflowStatus.status === 'idle' ? 'outline' : 
                         workflowStatus.status === 'running' ? 'secondary' : 
                         workflowStatus.status === 'completed' ? 'default' : 'destructive'}>
            {workflowStatus.status === 'idle' && 'Aguardando'}
            {workflowStatus.status === 'running' && 'Em Execução'}
            {workflowStatus.status === 'completed' && 'Concluído'}
            {workflowStatus.status === 'failed' && 'Falha'}
          </Badge>
          <span className="text-sm text-muted-foreground">
            Última atualização: {new Date(workflowStatus.lastUpdated).toLocaleTimeString()}
          </span>
        </div>
        <Button 
          size="sm" 
          variant="outline" 
          onClick={loadData}
          disabled={loading}
        >
          <RotateCw className="h-4 w-4 mr-1" />
          Atualizar
        </Button>
      </CardFooter>
    </Card>
  );
};

export default WorkflowStatus;