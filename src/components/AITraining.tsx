
import React, { useState } from 'react';
import { useToast } from "@/components/ui/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { webhookService } from '@/services/webhookService';
import assistantService from '@/services/assistantService';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';

const AITraining = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [aiName, setAiName] = useState('');
  const [firstMessage, setFirstMessage] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');

  // Fetch existing assistants for the current user
  const { data: assistants = [], isLoading } = useQuery({
    queryKey: ['assistants', user?.id],
    queryFn: () => assistantService.getAllAssistants(user?.id),
    enabled: !!user?.id
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!aiName || !firstMessage || !systemPrompt) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha todos os campos obrigatórios.",
        variant: "destructive"
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Enviar dados para o webhook via serviço
      const response = await webhookService.createAssistant({
        assistant_name: aiName,
        first_message: firstMessage,
        system_prompt: systemPrompt
      });
      
      if (response.success && response.data && response.data.assistant_id) {
        // Salvar assistente no banco de dados com o user_id
        const savedAssistant = await assistantService.saveAssistant({
          name: aiName,
          assistant_id: response.data.assistant_id,
          system_prompt: systemPrompt,
          first_message: firstMessage,
          user_id: user?.id,
          status: 'ready'
        });
        
        if (savedAssistant) {
          // Notify user's n8n workflow about the new assistant through their webhook
          try {
            // Using the users own collowop webhook to notify about the new assistant
            await fetch('https://primary-production-31de.up.railway.app/webhook/collowop', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                action: 'assistant_created',
                assistant_id: savedAssistant.assistant_id,
                assistant_name: savedAssistant.name,
                timestamp: new Date().toISOString(),
                user_id: savedAssistant.user_id,
                additional_data: {
                  is_ready: true,
                  system_prompt_length: systemPrompt.length,
                  first_message_preview: firstMessage.substring(0, 50) + (firstMessage.length > 50 ? '...' : '')
                }
              }),
            });
            console.log('Successfully notified n8n workflow about new assistant');
          } catch (webhookError) {
            console.error('Error notifying n8n workflow:', webhookError);
            // Continue even if the notification fails
          }
          
          toast({
            title: "Assistente criado com sucesso",
            description: "Seu assistente de IA foi criado e configurado.",
          });
          
          // Reset form
          setAiName('');
          setFirstMessage('');
          setSystemPrompt('');
          
          // Refresh assistants list
          queryClient.invalidateQueries({ queryKey: ['assistants'] });
        } else {
          toast({
            title: "Erro ao salvar assistente",
            description: "O assistente foi criado na Vapi, mas não foi possível salvá-lo no banco de dados.",
            variant: "destructive"
          });
        }
      } else {
        toast({
          title: "Erro ao criar assistente",
          description: "Ocorreu um erro ao criar seu assistente. Verifique os logs para mais detalhes.",
          variant: "destructive"
        });
        console.error('Erro na resposta do webhook:', response);
      }
    } catch (error) {
      console.error('Error creating assistant:', error);
      toast({
        title: "Erro ao criar assistente",
        description: "Ocorreu um erro ao criar seu assistente. Por favor, tente novamente.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
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
                <div key={assistant.id} className="p-4 border rounded-md">
                  <div className="font-medium">{assistant.name}</div>
                  <div className="text-sm text-muted-foreground mt-1">
                    Criado em: {new Date(assistant.created_at || '').toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Formulário para criar novo assistente */}
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
