import React, { useState, useEffect } from 'react';
import { useToast } from "@/components/ui/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { webhookService } from '@/services/webhookService';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { PlusCircle, Check, X, RefreshCw, Settings, Info, Trash2, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface AssistantResponse {
  success: boolean;
  data?: {
    assistant_id: string;
    [key: string]: any;
  };
  error?: string;
}

const AITraining = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [aiName, setAiName] = useState('');
  const [firstMessage, setFirstMessage] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [selectedAssistantId, setSelectedAssistantId] = useState<string | null>(null);

  // Carregar assistente selecionado do localStorage ao montar o componente
  useEffect(() => {
    try {
      const savedAssistant = localStorage.getItem('selected_assistant');
      if (savedAssistant) {
        const assistant = JSON.parse(savedAssistant);
        setSelectedAssistantId(assistant.id);
        console.log('Assistente atual carregado do localStorage:', assistant);
      }
    } catch (error) {
      console.error('Erro ao carregar assistente do localStorage:', error);
    }
  }, []);

  // Fetch existing assistants for the current user
  const { data: assistants = [], isLoading, refetch } = useQuery({
    queryKey: ['assistants', user?.id],
    queryFn: () => webhookService.getAllAssistants(user?.id),
    enabled: !!user?.id,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!aiName || !firstMessage || !systemPrompt) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha todos os campos obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Enviar dados para o webhook via serviço
      const response = await webhookService.createAssistant({
        assistant_name: aiName,
        first_message: firstMessage,
        system_prompt: systemPrompt,
      });

      if (response.success && response.data) {
        console.log('Assistente criado no Vapi:', response.data);
        
        toast({
          title: "Assistente criado com sucesso",
          description: "Seu assistente foi criado e está pronto para uso.",
        });

        // Atualizar a lista de assistentes
        queryClient.invalidateQueries({ queryKey: ['assistants', user?.id] });
        await refetch();

        // Resetar o formulário
        setAiName('');
        setFirstMessage('');
        setSystemPrompt('');
      } else {
        toast({
          title: "Erro ao criar assistente",
          description: response.message || "Houve um problema ao criar o assistente no Vapi.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Erro ao criar assistente:", error);
      toast({
        title: "Erro ao criar assistente",
        description: "Houve um problema ao criar o assistente. Por favor, tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelectAssistant = async (assistantId: string) => {
    try {
      const assistant = assistants.find(a => a.id === assistantId);
      
      if (assistant) {
        localStorage.setItem('selected_assistant', JSON.stringify(assistant));
        setSelectedAssistantId(assistantId);
        
        toast({
          title: "Assistente selecionado",
          description: `O assistente "${assistant.name}" foi selecionado com sucesso.`,
        });
        
        // Force a refresh of any component that depends on selected_assistant
        window.dispatchEvent(new Event('storage'));
      }
    } catch (error) {
      console.error('Erro ao selecionar assistente:', error);
      toast({
        title: "Erro ao selecionar assistente",
        description: "Não foi possível selecionar o assistente.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container mx-auto px-4 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Treinamento de IA</h1>
        <p className="text-muted-foreground">
          Configure seu assistente virtual personalizado para interagir com seus clientes.
        </p>
      </div>

      {/* Status do assistente atual */}
      {selectedAssistantId && (
        <Alert className="mb-8 border-primary/20 bg-primary/5">
          <Info className="h-4 w-4 text-primary" />
          <AlertTitle>Assistente Ativo</AlertTitle>
          <AlertDescription>
            {assistants.find(a => a.id === selectedAssistantId)?.name || 'Assistente selecionado'} está 
            configurado como seu assistente padrão para campanhas.
          </AlertDescription>
        </Alert>
      )}

      {/* Lista de assistentes existentes */}
      <Card className="mb-8">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <CardTitle>Assistentes Disponíveis</CardTitle>
            <CardDescription>
              Selecione um assistente para usar em suas campanhas
            </CardDescription>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => refetch()}
            className="text-xs"
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Atualizar
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : assistants.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <p>Você ainda não tem assistentes. Crie um abaixo.</p>
              </div>
            ) : (
              assistants.map((assistant) => (
                <div 
                  key={assistant.id} 
                  className={`p-4 border rounded-lg transition-all ${
                    selectedAssistantId === assistant.id 
                      ? 'border-primary bg-primary/5' 
                      : 'hover:border-primary/50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-medium flex items-center">
                        {assistant.name}
                        {assistant.status === 'ready' && (
                          <Badge variant="outline" className="ml-2 text-xs bg-green-50 text-green-700 border-green-200">
                            Pronto
                          </Badge>
                        )}
                        {assistant.status === 'pending' && (
                          <Badge variant="outline" className="ml-2 text-xs bg-yellow-50 text-yellow-700 border-yellow-200">
                            Pendente
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        Criado em: {new Date(assistant.created_at || '').toLocaleDateString()}
                      </div>
                      <div className="text-sm mt-2 text-muted-foreground line-clamp-2">
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant={selectedAssistantId === assistant.id ? "default" : "outline"}
                      onClick={() => handleSelectAssistant(assistant.id)}
                      className="shrink-0"
                    >
                      {selectedAssistantId === assistant.id ? (
                        <>
                          <Check className="h-4 w-4 mr-1" />
                          Selecionado
                        </>
                      ) : (
                        'Selecionar'
                      )}
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Formulário para criar novo assistente */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Configurar Novo Assistente Virtual</CardTitle>
          <CardDescription>
            Defina as configurações básicas para seu assistente virtual
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="aiName">Nome do Assistente</Label>
              <Input
                id="aiName"
                value={aiName}
                onChange={(e) => setAiName(e.target.value)}
                placeholder="Ex: Assistente de Vendas"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="firstMessage">Primeira Mensagem</Label>
              <Textarea
                id="firstMessage"
                value={firstMessage}
                onChange={(e) => setFirstMessage(e.target.value)}
                placeholder="Ex: Olá! Sou o assistente da empresa X. Como posso ajudar você hoje?"
                rows={3}
                required
              />
              <p className="text-xs text-muted-foreground">
                Esta será a primeira mensagem que seu assistente enviará ao cliente.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="systemPrompt">Prompt do Sistema</Label>
              <Textarea
                id="systemPrompt"
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                placeholder="Ex: Você é um assistente especializado em vendas de produtos de tecnologia. Seja educado, informativo e ajude o cliente a encontrar o produto ideal para suas necessidades."
                rows={5}
                required
              />
              <p className="text-xs text-muted-foreground">
                Estas são as instruções que definem como seu assistente deve se comportar.
              </p>
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={isSubmitting} className="w-full">
              {isSubmitting ? (
                <>
                  <Loader2 className="animate-spin mr-2 h-4 w-4" />
                  Criando Assistente...
                </>
              ) : (
                <>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Criar Assistente
                </>
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

export default AITraining;
