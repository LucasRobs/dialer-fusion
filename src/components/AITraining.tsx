
import React, { useState } from 'react';
import { useToast } from "@/components/ui/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { trainingService } from '@/services/trainingService';

const AITraining = () => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [aiName, setAiName] = useState('');
  const [firstMessage, setFirstMessage] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');

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
      // Prepare data for the webhook
      const trainingData = {
        assistant_name: aiName,
        first_message: firstMessage,
        system_prompt: systemPrompt,
        timestamp: new Date().toISOString()
      };
      
      // Send data to webhook
      const response = await fetch('https://primary-production-31de.up.railway.app/webhook/createassistant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(trainingData),
      });
      
      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }
      
      const result = await response.json();
      
      // Save the assistant information to localStorage
      if (result && result.assistant_id) {
        localStorage.setItem('vapi_assistant', JSON.stringify({
          id: result.assistant_id,
          name: aiName
        }));
      }
      
      toast({
        title: "Assistente criado com sucesso",
        description: "Seu assistente de IA foi criado e configurado.",
      });
      
      // Reset form
      setAiName('');
      setFirstMessage('');
      setSystemPrompt('');
      
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
