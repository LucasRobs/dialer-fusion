
import React, { useState, useEffect } from 'react';
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash } from "lucide-react";
import { webhookService } from '@/services/webhookService';
import assistantService, { Assistant } from '@/services/assistantService';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';

const AITraining = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [aiName, setAiName] = useState('');
  const [firstMessage, setFirstMessage] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [webhookResponse, setWebhookResponse] = useState<any>(null);
  const [isAsyncProcess, setIsAsyncProcess] = useState(false);

  const { data: assistants = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['assistants'],
    queryFn: assistantService.getAllAssistants
  });

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        setError(null);
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setWebhookResponse(null);
    setIsAsyncProcess(false);
    
    if (!aiName || !firstMessage || !systemPrompt) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha todos os campos obrigatórios.",
        variant: "destructive"
      });
      return;
    }
    
    if (!user?.id) {
      setError("Usuário não autenticado. Por favor, faça login novamente.");
      toast({
        title: "Erro de autenticação",
        description: "Você precisa estar logado para criar um assistente.",
        variant: "destructive"
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      console.log("Iniciando criação do assistente:", aiName);
      
      const response = await webhookService.createAssistant({
        assistant_name: aiName,
        first_message: firstMessage,
        system_prompt: systemPrompt
      });
      
      setWebhookResponse(response);
      console.log("Resposta do webhook:", response);
      
      if (response.success) {
        if (response.data && (response.data.isAsync || 
            (response.data.message && response.data.message.includes("started")))) {
          setIsAsyncProcess(true);
          
          try {
            const tempAssistantId = response.data.assistant_id || `pending_${Date.now()}`;
            
            // Salva o assistente com status "pending"
            const savedAssistant = await assistantService.saveAssistant({
              name: aiName,
              assistant_id: tempAssistantId,
              system_prompt: systemPrompt,
              first_message: firstMessage,
              user_id: user.id,
              status: 'pending'
            });
            
            console.log("Assistente temporário salvo com sucesso:", savedAssistant);
            
            toast({
              title: "Assistente em processamento",
              description: "Seu assistente foi enviado para processamento e será disponibilizado em breve.",
            });
            
            setAiName('');
            setFirstMessage('');
            setSystemPrompt('');
            
            queryClient.invalidateQueries({ queryKey: ['assistants'] });
          } catch (saveError) {
            console.error("Erro ao salvar assistente temporário:", saveError);
            setError(`Não foi possível registrar o assistente localmente: ${saveError instanceof Error ? saveError.message : 'Erro desconhecido'}`);
            toast({
              title: "Erro ao salvar localmente",
              description: "O assistente está sendo processado, mas não foi possível registrá-lo no banco de dados.",
              variant: "destructive"
            });
          }
        } else if (response.data && response.data.assistant_id) {
          console.log("Assistant ID recebido:", response.data.assistant_id);
          
          try {
            const savedAssistant = await assistantService.saveAssistant({
              name: aiName,
              assistant_id: response.data.assistant_id,
              system_prompt: systemPrompt,
              first_message: firstMessage,
              user_id: user.id,
              status: 'active'
            });
            
            console.log("Assistente salvo com sucesso:", savedAssistant);
            
            toast({
              title: "Assistente criado com sucesso",
              description: "Seu assistente de IA foi criado e configurado.",
            });
            
            setAiName('');
            setFirstMessage('');
            setSystemPrompt('');
            
            queryClient.invalidateQueries({ queryKey: ['assistants'] });
          } catch (saveError) {
            console.error("Erro ao salvar assistente:", saveError);
            setError(`Erro ao salvar assistente: ${saveError instanceof Error ? saveError.message : 'Erro desconhecido'}`);
            toast({
              title: "Erro ao salvar assistente",
              description: "O assistente foi criado na API, mas não foi possível salvá-lo no banco de dados.",
              variant: "destructive"
            });
          }
        } else {
          let errorMsg = 'Erro desconhecido';
          
          if (response.error) {
            errorMsg = response.error;
          } else if (response.data && response.data.error) {
            errorMsg = response.data.error;
          } else if (!response.success) {
            errorMsg = 'Erro na comunicação com o servidor';
          }
          
          setError(`Erro na resposta do webhook: ${errorMsg}`);
          toast({
            title: "Erro ao criar assistente",
            description: errorMsg,
            variant: "destructive"
          });
          console.error('Erro na resposta do webhook:', response);
        }
      } else {
        let errorMsg = 'Erro desconhecido';
        
        if (response.error) {
          errorMsg = response.error;
        } else if (response.data && response.data.error) {
          errorMsg = response.data.error;
        } else if (!response.success) {
          errorMsg = 'Erro na comunicação com o servidor';
        }
        
        setError(`Erro na resposta do webhook: ${errorMsg}`);
        toast({
          title: "Erro ao criar assistente",
          description: errorMsg,
          variant: "destructive"
        });
        console.error('Erro na resposta do webhook:', response);
      }
    } catch (error) {
      console.error('Error creating assistant:', error);
      setError(`Erro ao criar assistente: ${error instanceof Error ? error.message : String(error)}`);
      toast({
        title: "Erro ao criar assistente",
        description: "Ocorreu um erro ao criar seu assistente. Por favor, tente novamente.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (assistant: Assistant) => {
    if (!assistant.assistant_id) return;
    
    setIsDeleting(assistant.assistant_id);
    try {
      const deleted = await assistantService.deleteAssistant(assistant.assistant_id);
      
      if (deleted) {
        toast({
          title: "Assistente excluído",
          description: `O assistente "${assistant.name}" foi excluído com sucesso.`,
        });
        
        queryClient.invalidateQueries({ queryKey: ['assistants'] });
      } else {
        toast({
          title: "Erro ao excluir",
          description: "Não foi possível excluir o assistente. Tente novamente.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error deleting assistant:', error);
      toast({
        title: "Erro ao excluir",
        description: "Ocorreu um erro ao excluir o assistente.",
        variant: "destructive"
      });
    } finally {
      setIsDeleting(null);
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
      
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertTitle>Erro</AlertTitle>
          <AlertDescription className="whitespace-pre-wrap">{error}</AlertDescription>
        </Alert>
      )}
      
      {isAsyncProcess && (
        <Alert className="mb-6 bg-blue-50 border-blue-200">
          <AlertTitle className="text-blue-700">Processamento em andamento</AlertTitle>
          <AlertDescription className="text-blue-600">
            Seu assistente está sendo criado em segundo plano. Este processo pode levar alguns minutos.
            Você será notificado quando o processo estiver concluído.
          </AlertDescription>
        </Alert>
      )}
      
      {webhookResponse && !webhookResponse.success && (
        <Alert className="mb-6 bg-orange-50 border-orange-200">
          <AlertTitle className="text-orange-700">Detalhes técnicos do erro</AlertTitle>
          <AlertDescription className="text-orange-600">
            <div className="text-xs font-mono bg-orange-100 p-2 rounded my-2 overflow-auto max-h-40">
              {JSON.stringify(webhookResponse, null, 2)}
            </div>
            <p className="text-sm mt-2">
              Por favor, entre em contato com o suporte técnico e compartilhe estas informações.
            </p>
          </AlertDescription>
        </Alert>
      )}
      
      {assistants.length > 0 && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Assistentes Criados</CardTitle>
            <CardDescription>
              Assistentes de IA que você já configurou
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {assistants.map(assistant => (
                <div key={assistant.id} className="p-4 border rounded-md flex justify-between items-center">
                  <div className="flex-1">
                    <div className="font-medium">{assistant.name}</div>
                    <div className="text-sm text-muted-foreground mt-1">
                      Criado em: {new Date(assistant.created_at || '').toLocaleDateString()}
                    </div>
                    {assistant.status === 'pending' && (
                      <div className="text-xs text-blue-600 mt-1 flex items-center">
                        <div className="h-2 w-2 bg-blue-600 rounded-full mr-1 animate-pulse"></div>
                        Em processamento
                      </div>
                    )}
                  </div>
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={() => handleDelete(assistant)}
                    disabled={isDeleting === assistant.assistant_id}
                  >
                    {isDeleting === assistant.assistant_id ? (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    ) : (
                      <Trash className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
      
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Configurar Assistente Virtual</CardTitle>
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
                  <div className="animate-spin mr-2 h-4 w-4 border-t-2 border-b-2 border-current rounded-full"></div>
                  Criando Assistente...
                </>
              ) : (
                "Criar Assistente"
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

export default AITraining;
