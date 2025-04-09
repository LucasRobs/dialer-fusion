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

  // Fetch assistants
  const { data: assistants, isLoading, refetch } = useQuery({
    queryKey: ['assistants', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      return await webhookService.getAllAssistants(user.id);
    },
    enabled: !!user?.id
  });

  // Fetch assistants directly from Vapi API
  const fetchVapiAssistants = async () => {
    try {
      console.log('Fetching assistants directly from Vapi API...');
      const response = await fetch(`${VAPI_API_URL}/assistant`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${VAPI_API_KEY}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Error fetching Vapi assistants: ${response.status}`);
      }

      const data = await response.json();
      console.log('Assistants from Vapi API:', data);
      setVapiAssistants(data);
      return data;
    } catch (error) {
      console.error('Error fetching assistants from Vapi API:', error);
      return [];
    }
  };

  // Fetch Vapi assistants on component mount
  useEffect(() => {
    fetchVapiAssistants();
  }, []);

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
      console.error("Erro ao carregar assistente selecionado:", error);
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
      console.log("Iniciando criação de assistente com dados:", { name, firstMessage, systemPrompt, userId: user.id });
      
      const newAssistant = await webhookService.createAssistant({
        name,
        first_message: firstMessage,
        system_prompt: systemPrompt,
        userId: user.id
      });
      
      console.log("Assistente criado com sucesso:", newAssistant);
      
      // Refetch assistants and update selected assistant
      await refetch();
      
      // Select the newly created assistant
      if (newAssistant) {
        setSelectedAssistant(newAssistant);
        localStorage.setItem('selected_assistant', JSON.stringify(newAssistant));
      }
      
      // Reset form
      setName('');
      setFirstMessage('');
      setSystemPrompt('');
      
      // Success message
      toast.success(`Assistente "${newAssistant.name}" criado com sucesso!`);
    } catch (error) {
      console.error('Erro ao criar assistente:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro ao criar assistente';
      setError(errorMessage);
      toast.error(errorMessage);
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
      await refetch();
      // Also refresh Vapi assistants directly
      await fetchVapiAssistants();
      toast.success('Lista de assistentes atualizada');
    } catch (error) {
      console.error('Erro ao atualizar lista de assistentes:', error);
      toast.error('Erro ao atualizar lista de assistentes');
    }
  };

  const findVapiAssistantId = (localAssistantId: string): string | null => {
    if (!localAssistantId || !vapiAssistants || vapiAssistants.length === 0) {
      console.error(`Cannot find Vapi assistant: Invalid ID or no Vapi assistants available`);
      return null;
    }
    
    console.log(`Searching for Vapi assistant with local ID: ${localAssistantId} among ${vapiAssistants.length} Vapi assistants`);
    
    // First priority: match by the exact supabase_id in metadata which is unique
    const matchByExactMetadata = vapiAssistants.find(va => 
      va.metadata?.supabase_id === localAssistantId
    );
    
    if (matchByExactMetadata) {
      console.log(`Found Vapi assistant by exact metadata.supabase_id match: ${matchByExactMetadata.id}`);
      return matchByExactMetadata.id;
    }
    
    // Second priority: match by user_id in metadata and created timestamp if available
    const localAssistant = assistants?.find(a => a.id === localAssistantId);
    if (localAssistant) {
      // Try to match by user_id AND name - this is more specific than just name
      const matchByUserAndName = vapiAssistants.find(va => 
        va.metadata?.user_id === user?.id && 
        va.name === localAssistant.name
      );
      
      if (matchByUserAndName) {
        console.log(`Found Vapi assistant by user_id and name match: ${matchByUserAndName.id}`);
        return matchByUserAndName.id;
      }
      
      // Try to match by creation time proximity if we have timestamps
      if (localAssistant.created_at) {
        const localTimestamp = new Date(localAssistant.created_at).getTime();
        
        // Find the assistant with the closest creation timestamp
        let closestAssistant = null;
        let smallestTimeDiff = Infinity;
        
        vapiAssistants.forEach(va => {
          if (va.name === localAssistant.name && va.metadata?.created_at) {
            const vapiTimestamp = new Date(va.metadata.created_at).getTime();
            const timeDiff = Math.abs(vapiTimestamp - localTimestamp);
            
            if (timeDiff < smallestTimeDiff) {
              smallestTimeDiff = timeDiff;
              closestAssistant = va;
            }
          }
        });
        
        if (closestAssistant && smallestTimeDiff < 86400000) { // Within 24 hours
          console.log(`Found Vapi assistant by name and closest creation time: ${closestAssistant.id}`);
          return closestAssistant.id;
        }
      }
      
      // If we have an assistant_id stored, try that
      if (localAssistant.assistant_id) {
        const matchById = vapiAssistants.find(va => va.id === localAssistant.assistant_id);
        if (matchById) {
          console.log(`Found Vapi assistant by direct assistant_id match: ${matchById.id}`);
          return matchById.id;
        }
      }
    }
    
    // Lower priority: Try to match by just the name, but only if we have few candidates
    if (localAssistant?.name) {
      const nameMatches = vapiAssistants.filter(va => 
        va.name.toLowerCase() === localAssistant.name.toLowerCase()
      );
      
      // If there's just one match by name, we can use it
      if (nameMatches.length === 1) {
        console.log(`Found single Vapi assistant by name: ${nameMatches[0].id}`);
        return nameMatches[0].id;
      } 
      // If there are multiple matches, try to narrow down by user_id if available
      else if (nameMatches.length > 1) {
        console.log(`Found ${nameMatches.length} assistants with name "${localAssistant.name}"`);
        
        // Try to find the one that belongs to this user first
        const userMatch = nameMatches.find(va => va.metadata?.user_id === user?.id);
        if (userMatch) {
          console.log(`Selected assistant by user_id among name matches: ${userMatch.id}`);
          return userMatch.id;
        }
        
        // If still no unique match, let the user know about the ambiguity
        toast.error(`Múltiplos assistentes com o nome "${localAssistant.name}" encontrados. A exclusão pode não ser precisa.`);
        console.warn(`Multiple assistants with name "${localAssistant.name}" found. Using the first one.`);
        return nameMatches[0].id;
      }
    }
    
    console.warn(`Could not find Vapi assistant for local ID: ${localAssistantId}`);
    return null;
  };

  const handleDeleteAssistant = async () => {
    if (!assistantToDelete) return;
    
    setIsDeleting(true);
    try {
      console.log(`Starting deletion process for assistant: ${assistantToDelete.id}, name: ${assistantToDelete.name}`);
      
      // Get the Vapi assistant ID from our enhanced mapping function
      const vapiAssistantId = findVapiAssistantId(assistantToDelete.id);
      
      if (!vapiAssistantId) {
        console.error(`Could not find Vapi assistant ID for: ${assistantToDelete.id}`);
        toast.error('Não foi possível encontrar o ID do assistente na Vapi');
        setIsDeleting(false);
        return;
      }
      
      console.log(`Found Vapi assistant ID: ${vapiAssistantId} for local assistant: ${assistantToDelete.id}`);
      
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
      
      // Log the exact payload we're sending
      console.log("Sending webhook payload:", JSON.stringify(payload));
      
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
        console.error('Error response from webhook:', response.status, errorText);
        throw new Error(`Webhook error: ${response.status} ${errorText}`);
      }
      
      console.log('Webhook delete request sent successfully');
      
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
        
        toast.success(`Assistente "${assistantToDelete.name}" excluído com sucesso`);
      } else {
        toast.error(`Falha ao excluir assistente "${assistantToDelete.name}"`);
      }
    } catch (error) {
      console.error('Erro ao excluir assistente:', error);
      toast.error(`Erro ao excluir assistente: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
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
