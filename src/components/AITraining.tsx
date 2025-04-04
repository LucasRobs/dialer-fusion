import React, { useState, useEffect } from 'react';
import { useToast } from "@/components/ui/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from '@/components/ui/badge';
import { Loader2, PlusCircle, Check, RefreshCw } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { webhookService } from '@/services/webhookService';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const AITraining = () => {
  const { toast: uiToast } = useToast();
  const { user } = useAuth();

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

  // Buscar assistentes criados pelo usuário ou por conta padrão
  const { data: assistants = [], isLoading, refetch, isError } = useQuery({
    queryKey: ['assistants', user?.id],
    queryFn: async () => {
      const accountId = user?.id || "CONTA_PADRAO"; // Fallback para conta padrão
      console.log(`Carregando assistentes para a conta: ${accountId}`);
      return await webhookService._getLocalAssistants(accountId);
    },
    enabled: true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!aiName || !firstMessage || !systemPrompt) {
      uiToast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha todos os campos obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await webhookService.createAssistant({
        name: aiName,
        first_message: firstMessage,
        system_prompt: systemPrompt,
        user_id: user?.id || "CONTA_PADRAO", // Fallback to default account if user ID is unavailable
      });

      if (response) {
        console.log('Assistente criado:', response);
        toast.success("Assistente criado com sucesso!");
        await refetch();
        setAiName('');
        setFirstMessage('');
        setSystemPrompt('');
      } else {
        toast.error("Erro ao criar assistente. Por favor, verifique os dados e tente novamente.");
      }
    } catch (error) {
      console.error("Erro ao criar assistente:", error);
      toast.error("Erro ao criar assistente. Por favor, tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelectAssistant = (assistantId: string) => {
    const assistant = assistants.find(a => a.id === assistantId);
    if (assistant) {
      localStorage.setItem('selected_assistant', JSON.stringify(assistant));
      setSelectedAssistantId(assistantId);
      toast.success(`Assistente "${assistant.name}" selecionado com sucesso.`);
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

      {/* Lista de assistentes existentes */}
      <Card className="mb-8">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <CardTitle>Assistentes Disponíveis</CardTitle>
            <CardDescription>
              Selecione um assistente para usar em suas campanhas.
            </CardDescription>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => refetch()}
            disabled={isLoading}
            className="text-xs"
          >
            {isLoading ? (
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            ) : (
              <RefreshCw className="h-3 w-3 mr-1" />
            )}
            Atualizar
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : isError ? (
            <div className="text-center py-6 text-red-500">
              <p>Erro ao carregar assistentes. Tente novamente mais tarde.</p>
            </div>
          ) : assistants.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <p>Nenhum assistente disponível. Crie um abaixo.</p>
            </div>
          ) : (
            <ul className="space-y-4">
              {assistants.map((assistant) => (
                <li 
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
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        Criado em: {new Date(assistant.created_at).toLocaleDateString()}
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
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Formulário para criar novo assistente */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Configurar Novo Assistente Virtual</CardTitle>
          <CardDescription>
            Defina as configurações básicas para seu assistente virtual.
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
            </div>

            <div className="space-y-2">
              <Label htmlFor="systemPrompt">Prompt do Sistema</Label>
              <Textarea
                id="systemPrompt"
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                placeholder="Ex: Você é um assistente especializado em vendas de produtos de tecnologia."
                rows={5}
                required
              />
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