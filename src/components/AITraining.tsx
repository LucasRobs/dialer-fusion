import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardHeader, CardContent, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Bot, Plus, Loader2, AlertCircle, RefreshCcw, Trash2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { webhookService, VapiAssistant } from '@/services/webhookService'; 
import { toast } from 'sonner';
import { supabase, checkSupabaseConnection, VAPI_CONFIG } from '@/integrations/supabase/client';
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
  const [isSyncingWithVapi, setIsSyncingWithVapi] = useState(false);
  const [initialSyncDone, setInitialSyncDone] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'connected' | 'failed'>('checking');

  // Check Supabase connection on component mount
  useEffect(() => {
    const checkConnection = async () => {
      setConnectionStatus('checking');
      const isConnected = await checkSupabaseConnection();
      setConnectionStatus(isConnected ? 'connected' : 'failed');
      
      if (!isConnected) {
        toast.error("Falha na conexão com o Supabase", {
          description: "Não foi possível conectar ao banco de dados. Algumas funcionalidades podem não funcionar corretamente."
        });
      }
    };
    
    checkConnection();
  }, []);

  // Fetch assistants with more frequent refetching, filtered by user ID
  const { data: assistants, isLoading, refetch } = useQuery({
    queryKey: ['assistants', user?.id],
    queryFn: async () => {
      if (!user?.id) {
        console.log('No user ID available, skipping assistant fetch');
        return [];
      }
      
      console.log('Fetching assistants for user:', user.id);
      
      // Try to get assistants from Supabase - filtered by the current user ID
      try {
        const { data: supabaseAssistants, error } = await supabase
          .from('assistants')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
          
        if (error) {
          console.error('Error fetching assistants from Supabase:', error);
          throw error;
        }
        
        console.log('Fetched Supabase assistants for current user:', supabaseAssistants || []);
        
        // If we don't have any assistants in Supabase or this is the first load,
        // try to get them from Vapi API
        if (!initialSyncDone || !supabaseAssistants || supabaseAssistants.length === 0) {
          console.log('Fetching from Vapi API - initial sync or no assistants found in Supabase');
          await fetchVapiAssistants(); // This will sync to Supabase
          setInitialSyncDone(true);
          
          // After syncing, fetch again from Supabase
          const { data: refreshedAssistants } = await supabase
            .from('assistants')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });
            
          return refreshedAssistants || [];
        }
        
        return supabaseAssistants || [];
      } catch (error) {
        console.error('Error in queryFn for assistants:', error);
        toast.error("Erro ao carregar assistentes");
        return [];
      }
    },
    enabled: !!user?.id && connectionStatus === 'connected',
    refetchInterval: 5000, // Refetch every 5 seconds
    staleTime: 2000, // Consider data stale sooner
  });

  // Fetch assistants directly from Vapi API, filter by current user, and sync to Supabase
  const fetchVapiAssistants = useCallback(async () => {
    if (!user?.id) {
      console.log('No user ID available, skipping Vapi fetch');
      return [];
    }

    setIsSyncingWithVapi(true);
    console.log('Fetching assistants from Vapi API for user:', user.id);
    
    try {
      const vapiAssistantsList = await webhookService.getAssistantsFromVapiApi();
      console.log('Raw assistants from Vapi API:', vapiAssistantsList);
      
      if (!Array.isArray(vapiAssistantsList)) {
        console.error('Expected array from Vapi API but got:', typeof vapiAssistantsList);
        setIsSyncingWithVapi(false);
        return [];
      }
      
      // Filter by current user
      const userVapiAssistants = vapiAssistantsList.filter(assistant => 
        assistant.metadata?.user_id === user.id
      );
      console.log(`Filtered ${userVapiAssistants.length} assistants for user ${user.id} from ${vapiAssistantsList.length} total`);
      
      setVapiAssistants(userVapiAssistants);
      
      if (userVapiAssistants && userVapiAssistants.length > 0 && user.id) {
        console.log('Syncing filtered Vapi assistants to Supabase');
        
        // Direct insert to Supabase for immediate results
        for (const asst of userVapiAssistants) {
          try {
            const formattedAssistant = {
              id: `vapi-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
              name: asst.name || 'Unnamed Assistant',
              assistant_id: asst.id,
              first_message: asst.first_message || asst.firstMessage || '',
              system_prompt: asst.instructions || asst.system_prompt || '',
              user_id: user.id,
              status: asst.status || 'active',
              model: (asst.model && asst.model.model) || asst.model || 'gpt-4o-turbo',
              voice: (asst.voice && asst.voice.voiceId) || asst.voice || '33B4UnXyTNbgLmdEDh5P',
              voice_id: (asst.voice && asst.voice.voiceId) || asst.voice_id || '33B4UnXyTNbgLmdEDh5P',
              created_at: asst.createdAt || new Date().toISOString(),
              metadata: asst.metadata || { user_id: user.id }
            };
            
            // Check if assistant already exists by assistant_id
            const { data: existingAsst } = await supabase
              .from('assistants')
              .select('id')
              .eq('assistant_id', asst.id)
              .maybeSingle();
              
            if (existingAsst) {
              console.log(`Assistant ${asst.name} with ID ${asst.id} already exists, skipping`);
              // Using if block instead of continue statement
            } else {
              // Insert with retry
              let retries = 0;
              const maxRetries = 3;
              
              while (retries < maxRetries) {
                const { error: insertError } = await supabase
                  .from('assistants')
                  .insert([formattedAssistant]);
                  
                if (!insertError) {
                  console.log(`Successfully inserted assistant ${asst.name} into Supabase`);
                  break;
                } else {
                  console.error(`Error inserting assistant (attempt ${retries + 1}):`, insertError);
                  retries++;
                  if (retries >= maxRetries) break;
                  await new Promise(resolve => setTimeout(resolve, 1000)); // Wait before retry
                }
              }
            }
          } catch (error) {
            console.error('Error processing assistant for sync:', error);
          }
        }
        
        // Refetch assistants from Supabase to show updated list
        await refetch();
        console.log('Sync and refetch completed');
      } else {
        console.log('No Vapi assistants found for current user or no user ID available');
      }
      
      setIsSyncingWithVapi(false);
      return userVapiAssistants;
    } catch (error) {
      console.error('Error fetching Vapi assistants:', error);
      setIsSyncingWithVapi(false);
      return [];
    }
  }, [user, refetch]);

  // Fetch Vapi assistants on component mount and set up polling
  useEffect(() => {
    if (user?.id && connectionStatus === 'connected') {
      console.log('Component mounted, fetching Vapi assistants for user:', user.id);
      fetchVapiAssistants().then(() => {
        console.log('Initial Vapi fetch completed');
        setInitialSyncDone(true);
      });
      
      // Set up interval to periodically refresh assistants
      const intervalId = setInterval(() => {
        console.log('Running periodic refresh of assistants');
        refetch();
      }, 10000);
      
      return () => {
        console.log('Clearing assistant refresh interval');
        clearInterval(intervalId);
      }
    }
  }, [user?.id, connectionStatus, fetchVapiAssistants, refetch]);

  // Load selected assistant from localStorage
  useEffect(() => {
    try {
      const storedAssistant = localStorage.getItem('selected_assistant');
      if (storedAssistant) {
        const parsed = JSON.parse(storedAssistant);
        // Ensure metadata property exists
        if (parsed && !parsed.metadata) {
          parsed.metadata = { user_id: parsed.user_id };
        }
        setSelectedAssistant(parsed);
      } else if (assistants && assistants.length > 0) {
        // Select first assistant without filtering by status
        const first = assistants[0];
        // Ensure metadata property exists
        if (first && !first.metadata) {
          first.metadata = { user_id: first.user_id };
        }
        setSelectedAssistant(first);
        localStorage.setItem('selected_assistant', JSON.stringify(first));
      }
    } catch (error) {
      // Silent error handling
      console.error('Error loading selected assistant from localStorage:', error);
    }
  }, [assistants]);

  // Handle creating a new assistant
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
      
      // First show loading toast
      toast.loading('Criando assistente...', { id: 'creating-assistant' });
      
      const newAssistant = await webhookService.createAssistant({
        name,
        first_message: firstMessage,
        system_prompt: systemPrompt,
        userId: user.id
      });
      
      console.log('Assistant created successfully:', newAssistant);
      
      // Dismiss the loading toast and show success
      toast.dismiss('creating-assistant');
      toast.success('Assistente criado com sucesso!');
      
      // Insert directly to Supabase to ensure immediate visibility
      if (newAssistant) {
        try {
          // Format for direct insertion ensuring all required fields are present
          const assistantForDb: VapiAssistant = {
            id: `vapi-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
            name: name,
            assistant_id: newAssistant.assistant_id || newAssistant.id,
            first_message: firstMessage,
            system_prompt: systemPrompt,
            user_id: user.id,
            status: 'active',
            model: 'gpt-4o-turbo',
            voice: '33B4UnXyTNbgLmdEDh5P',
            voice_id: '33B4UnXyTNbgLmdEDh5P',
            created_at: new Date().toISOString(),
            metadata: { user_id: user.id }
          };
          
          // Check if assistant already exists by assistant_id
          const { data: existingAsst } = await supabase
            .from('assistants')
            .select('id')
            .eq('assistant_id', newAssistant.id || newAssistant.assistant_id)
            .maybeSingle();
            
          if (!existingAsst) {
            // Insert with retry
            let retries = 0;
            const maxRetries = 3;
            
            while (retries < maxRetries) {
              const { error: insertError } = await supabase
                .from('assistants')
                .insert([assistantForDb]);
                
              if (!insertError) {
                console.log(`Successfully inserted assistant ${name} into Supabase`);
                break;
              } else {
                console.error(`Error inserting assistant (attempt ${retries + 1}):`, insertError);
                retries++;
                if (retries >= maxRetries) break;
                await new Promise(resolve => setTimeout(resolve, 1000)); // Wait before retry
              }
            }
          } else {
            console.log(`Assistant ${name} already exists in Supabase, skipping direct insert`);
          }
        } catch (directInsertError) {
          console.error('Exception during direct insert to Supabase:', directInsertError);
        }
      }
      
      // Update the local assistants list immediately
      if (newAssistant) {
        // Ensure newAssistant has the required metadata property
        if (!newAssistant.metadata) {
          newAssistant.metadata = { user_id: user.id };
        }
        
        if (assistants) {
          queryClient.setQueryData(['assistants', user.id], [newAssistant, ...assistants]);
        } else {
          queryClient.setQueryData(['assistants', user.id], [newAssistant]);
        }
      }
      
      // Force immediate refetch to ensure the list is up-to-date
      await refetch();
      
      // Also fetch from Vapi to make sure everything is in sync
      await fetchVapiAssistants();
      
      // Select the newly created assistant
      if (newAssistant) {
        // Ensure newAssistant has metadata
        if (!newAssistant.metadata) {
          newAssistant.metadata = { user_id: user.id };
        }
        setSelectedAssistant(newAssistant);
        localStorage.setItem('selected_assistant', JSON.stringify(newAssistant));
      }
      
      // Reset form
      setName('');
      setFirstMessage('');
      setSystemPrompt('');
      
    } catch (error) {
      console.error('Error creating assistant:', error);
      toast.dismiss('creating-assistant');
      toast.error('Erro ao criar assistente');
      
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError('Erro desconhecido ao criar assistente');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelectAssistant = (assistant: VapiAssistant) => {
    // Ensure metadata property exists
    if (!assistant.metadata) {
      assistant.metadata = { user_id: assistant.user_id };
    }
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

  // Handle assistant deletion with better error handling
  const handleDeleteAssistant = async () => {
    if (!assistantToDelete) return;
    
    setIsDeleting(true);
    try {
      console.log('Deleting assistant:', assistantToDelete);
      
      // Show toast indicating deletion in progress
      toast.loading('Excluindo assistente...', { id: 'deleting-assistant' });
      
      // Add VAPI API KEY to the request body
      const success = await webhookService.deleteAssistant(assistantToDelete.id);
      
      // Clear the loading toast
      toast.dismiss('deleting-assistant');
      
      if (success) {
        toast.success('Assistente excluído com sucesso!');
        
        // Also try to delete directly from Supabase
        try {
          if (assistantToDelete.assistant_id) {
            const { error } = await supabase
              .from('assistants')
              .delete()
              .eq('assistant_id', assistantToDelete.assistant_id);
              
            if (error) {
              console.error('Error deleting from Supabase by assistant_id:', error);
              
              // Try by id as fallback
              const { error: idError } = await supabase
                .from('assistants')
                .delete()
                .eq('id', assistantToDelete.id);
                
              if (idError) {
                console.error('Error deleting from Supabase by id:', idError);
              }
            }
          }
        } catch (supabaseError) {
          console.error('Exception during Supabase delete:', supabaseError);
        }
        
        // Update the list of assistants
        await refetch();
        // Also refresh Vapi assistants
        await fetchVapiAssistants();
        
        // If the deleted assistant was selected, select another one
        if (selectedAssistant?.id === assistantToDelete.id) {
          const remainingAssistants = assistants?.filter(a => a.id !== assistantToDelete.id) || [];
          if (remainingAssistants.length > 0) {
            // Ensure metadata property exists
            const firstAssistant = remainingAssistants[0];
            if (firstAssistant && !firstAssistant.metadata) {
              firstAssistant.metadata = { user_id: firstAssistant.user_id };
            }
            setSelectedAssistant(firstAssistant);
            localStorage.setItem('selected_assistant', JSON.stringify(firstAssistant));
          } else {
            setSelectedAssistant(null);
            localStorage.removeItem('selected_assistant');
          }
        }
      } else {
        toast.error('Não foi possível excluir o assistente completamente. Recarregue a página e tente novamente.');
      }
    } catch (error) {
      toast.dismiss('deleting-assistant');
      console.error('Error in handleDeleteAssistant:', error);
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
        
        {connectionStatus === 'checking' && (
          <Alert className="mt-4 bg-yellow-50 border-yellow-200">
            <AlertCircle className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-600">
              Verificando conexão com o banco de dados...
            </AlertDescription>
          </Alert>
        )}
        
        {connectionStatus === 'failed' && (
          <Alert variant="destructive" className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Falha na conexão com o banco de dados. Algumas funcionalidades podem não funcionar corretamente.
              <Button 
                variant="outline" 
                size="sm" 
                className="ml-2"
                onClick={() => window.location.reload()}
              >
                Tentar novamente
              </Button>
            </AlertDescription>
          </Alert>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Lista de Assistentes */}
        <div className="md:col-span-1">
          <Card className="mb-6">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Meus Assistentes</CardTitle>
                  <CardDescription>
                    {selectedAssistant 
                      ? `Assistente atual: ${selectedAssistant.name}`
                      : 'Selecione ou crie um assistente'}
                  </CardDescription>
                </div>
                <Button 
                  variant="outline" 
                  size="icon" 
                  onClick={handleRefreshAssistants} 
                  disabled={isSyncingWithVapi || isLoading}
                  title="Atualizar lista"
                >
                  {isSyncingWithVapi ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCcw className="h-4 w-4" />
                  )}
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
                  {user ? (
                    initialSyncDone ? (
                      'Nenhum assistente encontrado. Crie seu primeiro assistente!'
                    ) : (
                      <div className="flex flex-col items-center">
                        <Loader2 className="h-6 w-6 animate-spin mb-2" />
                        <p>Sincronizando assistentes...</p>
                      </div>
                    )
                  ) : 'Faça login para ver seus assistentes.'}
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
