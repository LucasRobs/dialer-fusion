
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardHeader, CardContent, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Bot, Plus, Loader2, AlertCircle, RefreshCcw, Trash2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { webhookService, VapiAssistant } from '@/services/webhookService'; 
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

import assistantService from '@/services/assistantService';

const VAPI_API_KEY = "494da5a9-4a54-4155-bffb-d7206bd72afd";
const VAPI_API_URL = "https://api.vapi.ai";

const AITraining = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [firstMessage, setFirstMessage] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedAssistant, setSelectedAssistant] = useState<VapiAssistant | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [assistantToDelete, setAssistantToDelete] = useState<VapiAssistant | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [vapiAssistants, setVapiAssistants] = useState<any[]>([]);

  // Fetch assistants with more frequent refetching
  const { data: assistants, isLoading, refetch } = useQuery({
    queryKey: ['assistants', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      console.log('Fetching assistants for user:', user.id);
      
      // Try to get assistants from Supabase
      const supabaseAssistants = await webhookService.getAllAssistants(user.id);
      console.log('Fetched Supabase assistants:', supabaseAssistants);
      
      // If we don't have any assistants in Supabase, try to get them from Vapi API
      if (!supabaseAssistants || supabaseAssistants.length === 0) {
        console.log('No assistants found in Supabase, fetching from Vapi API');
        const vapiAssistantsList = await webhookService.getAssistantsFromVapiApi();
        console.log('Assistants from Vapi API:', vapiAssistantsList);
        
        // If we got assistants from Vapi API, sync them with Supabase and return
        if (vapiAssistantsList && vapiAssistantsList.length > 0) {
          await webhookService.syncVapiAssistantsToSupabase(vapiAssistantsList);
          // Fetch assistants from Supabase again after syncing
          return await webhookService.getAllAssistants(user.id);
        }
      }
      
      return supabaseAssistants;
    },
    enabled: !!user?.id,
    refetchInterval: 3000, // Refetch even more frequently to catch updates
    staleTime: 1000, // Consider data stale sooner
  });

  // Fetch assistants directly from Vapi API and sync to Supabase
  const fetchVapiAssistants = async () => {
    try {
      const vapiAssistantsList = await webhookService.getAssistantsFromVapiApi();
      setVapiAssistants(vapiAssistantsList);
      
      if (vapiAssistantsList && vapiAssistantsList.length > 0 && user?.id) {
        // Sync Vapi assistants to Supabase
        await webhookService.syncVapiAssistantsToSupabase(vapiAssistantsList);
        // Refetch assistants from Supabase to show updated list
        refetch();
      }
      
      return vapiAssistantsList;
    } catch (error) {
      console.error('Error fetching Vapi assistants:', error);
      return [];
    }
  };

  // Fetch Vapi assistants on component mount and set up polling
  useEffect(() => {
    fetchVapiAssistants();
    
    // Set up interval to periodically refresh assistants
    const intervalId = setInterval(() => {
      refetch();
      fetchVapiAssistants();
    }, 10000);
    
    return () => clearInterval(intervalId);
  }, [refetch]);

  // Load selected assistant from localStorage
  useEffect(() => {
    try {
      const storedAssistant = localStorage.getItem('selected_assistant');
      if (storedAssistant) {
        setSelectedAssistant(JSON.parse(storedAssistant));
      } else if (assistants && assistants.length > 0) {
        // Select first assistant without filtering by status
        setSelectedAssistant(assistants[0]);
        localStorage.setItem('selected_assistant', JSON.stringify(assistants[0]));
      }
    } catch (error) {
      // Silent error handling
      console.error('Error loading selected assistant from localStorage:', error);
    }
  }, [assistants]);

  const handleCreateAssistant = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (!name || !firstMessage || !systemPrompt) {
      toast.error('Por favor, preencha todos os campos');
      return;
    }

    if (!user?.id) {
      toast.error('Você precisa estar logado para criar um assistente');
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Create the assistant
      console.log('Creating assistant with params:', { name, firstMessage, systemPrompt, userId: user.id });
      const newAssistant = await webhookService.createAssistant({
        name,
        first_message: firstMessage,
        system_prompt: systemPrompt,
        userId: user.id
      });
      
      console.log('Assistant created successfully:', newAssistant);
      
      // Update the local assistants list immediately
      if (assistants) {
        queryClient.setQueryData(['assistants', user.id], [newAssistant, ...assistants]);
      }
      
      // Force immediate refetch to ensure the list is up-to-date
      refetch();
      
      // Select the newly created assistant
      if (newAssistant) {
        setSelectedAssistant(newAssistant);
        localStorage.setItem('selected_assistant', JSON.stringify(newAssistant));
      }
      
      // Reset form
      setName('');
      setFirstMessage('');
      setSystemPrompt('');
      
      // Show success toast
      toast.success('Assistente criado com sucesso!');
      
    } catch (error) {
      console.error('Error creating assistant:', error);
      // Don't show error - webhook service now handles this with success message
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelectAssistant = (assistant: VapiAssistant) => {
    setSelectedAssistant(assistant);
    localStorage.setItem('selected_assistant', JSON.stringify(assistant));
    toast.success(`Assistente "${assistant.name}" selecionado como padrão`);
  };

  const handleRefreshAssistants = async () => {
    try {
      toast.info('Atualizando lista de assistentes...');
      await refetch();
      // Also refresh Vapi assistants directly
      await fetchVapiAssistants();
      toast.success('Lista de assistentes atualizada');
    } catch (error) {
      console.error('Error refreshing assistants:', error);
      toast.error('Erro ao atualizar lista de assistentes');
    }
  };

  const handleDeleteAssistant = async () => {
    if (!assistantToDelete) return;
    
    setIsDeleting(true);
    try {
      // Find the correct Vapi ID for the assistant
      const vapiAssistantId = await assistantService.findVapiAssistantId(
        assistantToDelete.id,
        assistantToDelete.name,
        user?.id
      );
      
      if (!vapiAssistantId) {
        toast.error('Não foi possível encontrar o ID do assistente na Vapi');
        setIsDeleting(false);
        return;
      }
      
      // The webhook URL for deleting the assistant
      const webhookUrl = 'https://primary-production-31de.up.railway.app/webhook/deleteassistant';
      
      // Create the payload in the exact format expected by n8n webhook
      const payload = {
        action: "delete_assistant",
        assistant_id: vapiAssistantId,
        additional_data: {
          assistant_name: assistantToDelete.name,
          user_id: user?.id,
          timestamp: new Date().toISOString(),
          supabase_id: assistantToDelete.id
        }
      };
      
      // Make sure the payload matches the expected webhook format
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      
      // Check for response
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Webhook error: ${response.status} ${errorText}`);
      }
      
      // Continue with local deletion as before
      const success = await webhookService.deleteAssistant(assistantToDelete.id);
      
      if (success) {
        // Update the list of assistants
        await refetch();
        // Also refresh Vapi assistants
        await fetchVapiAssistants();
        
        // If the deleted assistant was selected, select another one
        if (selectedAssistant?.id === assistantToDelete.id) {
          const remainingAssistants = assistants?.filter(a => a.id !== assistantToDelete.id) || [];
          if (remainingAssistants.length > 0) {
            setSelectedAssistant(remainingAssistants[0]);
            localStorage.setItem('selected_assistant', JSON.stringify(remainingAssistants[0]));
          } else {
            setSelectedAssistant(null);
            localStorage.removeItem('selected_assistant');
          }
        }
      }
    } catch (error) {
      toast.error('Não foi possível excluir o assistente');
    } finally {
      setIsDeleting(false);
      setAssistantToDelete(null);
    }
  };

  return (
    <div className="container mx-auto px-4 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Treinamento de IA</h1>
        <p className="text-foreground/70">Crie e gerencie seus assistentes virtuais.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Lista de Assistentes */}
        <div className="md:col-span-1">
          <Card className="mb-6">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Assistentes</CardTitle>
                  <CardDescription>
                    {selectedAssistant 
                      ? `Assistente atual: ${selectedAssistant.name}`
                      : 'Selecione ou crie um assistente'}
                  </CardDescription>
                </div>
                <Button variant="outline" size="icon" onClick={handleRefreshAssistants} title="Atualizar lista">
                  <RefreshCcw className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoading ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : assistants && assistants.length > 0 ? (
                <div className="space-y-2">
                  {assistants.map((assistant) => (
                    <div 
                      key={assistant.id} 
                      className="flex items-center gap-2"
                    >
                      <Button
                        variant={selectedAssistant?.id === assistant.id ? "default" : "outline"}
                        className="w-full justify-start text-left group"
                        onClick={() => handleSelectAssistant(assistant)}
                      >
                        <Bot className="mr-2 h-4 w-4" />
                        <span className="truncate flex-1">{assistant.name}</span>
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="icon"
                            className="h-9 w-9 shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                            onClick={() => setAssistantToDelete(assistant)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Excluir Assistente</AlertDialogTitle>
                            <AlertDialogDescription>
                              Tem certeza que deseja excluir o assistente "{assistantToDelete?.name}"? 
                              Esta ação não pode ser desfeita.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              onClick={handleDeleteAssistant}
                              disabled={isDeleting}
                            >
                              {isDeleting ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Excluindo...
                                </>
                              ) : (
                                'Excluir'
                              )}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  Nenhum assistente encontrado. Crie seu primeiro assistente!
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Formulário de Criação */}
        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Criar Novo Assistente</CardTitle>
              <CardDescription>
                Configure as respostas e comportamento do seu assistente virtual
              </CardDescription>
            </CardHeader>
            {error && (
              <Alert variant="destructive" className="mx-6 mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <form onSubmit={handleCreateAssistant}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="name" className="text-sm font-medium">
                    Nome do Assistente
                  </label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Assistente de Vendas"
                    disabled={isSubmitting}
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="firstMessage" className="text-sm font-medium">
                    Primeira Mensagem
                  </label>
                  <Textarea
                    id="firstMessage"
                    value={firstMessage}
                    onChange={(e) => setFirstMessage(e.target.value)}
                    placeholder="Ex: Olá! Sou o assistente da empresa. Como posso ajudar hoje?"
                    rows={3}
                    disabled={isSubmitting}
                  />
                  <p className="text-xs text-muted-foreground">
                    Esta será a primeira mensagem que o assistente enviará ao iniciar uma conversa.
                  </p>
                </div>
                <div className="space-y-2">
                  <label htmlFor="systemPrompt" className="text-sm font-medium">
                    Prompt do Sistema
                  </label>
                  <Textarea
                    id="systemPrompt"
                    value={systemPrompt}
                    onChange={(e) => setSystemPrompt(e.target.value)}
                    placeholder="Ex: Você é um assistente virtual especializado em vendas. Seja cordial e profissional."
                    rows={5}
                    disabled={isSubmitting}
                  />
                  <p className="text-xs text-muted-foreground">
                    Instruções de como o assistente deve se comportar. O usuário não verá estas instruções.
                  </p>
                </div>
              </CardContent>
              <CardFooter>
                <Button type="submit" disabled={isSubmitting} className="w-full">
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Criando Assistente...
                    </>
                  ) : (
                    <>
                      <Plus className="mr-2 h-4 w-4" />
                      Criar Assistente
                    </>
                  )}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AITraining;
