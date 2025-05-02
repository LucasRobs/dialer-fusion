
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { webhookService } from '@/services/webhookService';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Loader2, Bot, Phone } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface Assistant {
  id: string;
  name: string;
  status?: string;
}

interface SelectAssistantDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (assistantId: string, assistantName: string) => void;
  client: any;
}

const SelectAssistantDialog = ({ isOpen, onClose, onSelect, client }: SelectAssistantDialogProps) => {
  const [selectedAssistantId, setSelectedAssistantId] = useState<string>('');
  const [userId, setUserId] = useState<string | null>(null);
  
  // Fetch current user ID
  useEffect(() => {
    const fetchUserId = async () => {
      try {
        const { data } = await supabase.auth.getUser();
        console.log("Usuário atual:", data?.user);
        setUserId(data?.user?.id || null);
      } catch (error) {
        console.error("Erro ao buscar ID do usuário:", error);
      }
    };
    
    if (isOpen) {
      fetchUserId();
    }
  }, [isOpen]);
  
  // Busca assistentes quando o diálogo é aberto e o ID do usuário está disponível
  const { 
    data: assistants = [], 
    isLoading, 
    error, 
    refetch 
  } = useQuery({
    queryKey: ['assistants', userId],
    queryFn: async () => {
      try {
        console.log("Buscando assistentes para usuário:", userId);
        if (!userId) return [];
        
        // Buscar assistentes diretamente da Vapi API
        const vapiAssistants = await webhookService.getAssistantsFromVapiApi();
        console.log("Assistentes obtidos da Vapi API:", vapiAssistants);
        
        // Filtrar apenas assistentes do usuário atual
        const userAssistants = vapiAssistants.filter(assistant => 
          assistant.metadata?.user_id === userId
        );
        
        console.log("Assistentes filtrados para o usuário:", userAssistants);
        
        if (userAssistants && userAssistants.length > 0) {
          await webhookService.syncVapiAssistantsToSupabase(userAssistants);
          return userAssistants;
        }
        
        // Se não encontrar na API, buscar localmente como fallback
        const localAssistants = await webhookService.getAllAssistants(userId);
        console.log("Assistentes locais:", localAssistants);
        return localAssistants;
      } catch (error) {
        console.error('Erro ao buscar assistentes:', error);
        // Tentar buscar localmente em caso de erro na API
        try {
          const localAssistants = await webhookService.getAllAssistants(userId || '');
          return localAssistants;
        } catch (err) {
          console.error('Erro ao buscar assistentes localmente:', err);
          return [];
        }
      }
    },
    enabled: isOpen && userId !== null,
  });

  // Inicializar assistente selecionado
  useEffect(() => {
    if (isOpen && assistants.length > 0) {
      try {
        // Tentar obter do localStorage primeiro
        const storedAssistant = localStorage.getItem('selected_assistant');
        if (storedAssistant) {
          const assistant = JSON.parse(storedAssistant);
          if (assistant && assistant.id) {
            // Verificar se o assistente armazenado existe na lista atual
            const exists = assistants.some(a => a.id === assistant.id);
            if (exists) {
              console.log("Usando assistente do localStorage:", assistant.id);
              setSelectedAssistantId(assistant.id);
              return;
            }
          }
        }
        
        // Se não encontrar no localStorage ou se não for válido, usar o primeiro da lista
        console.log("Usando primeiro assistente da lista:", assistants[0].id);
        setSelectedAssistantId(assistants[0].id);
      } catch (e) {
        console.error('Erro ao inicializar assistente:', e);
        if (assistants.length > 0) {
          setSelectedAssistantId(assistants[0].id);
        }
      }
    }
  }, [isOpen, assistants]);

  const handleSelect = () => {
    if (!selectedAssistantId) {
      toast.error("Por favor, selecione um assistente virtual");
      return;
    }
    
    const assistant = assistants.find(a => a.id === selectedAssistantId);
    if (!assistant) {
      toast.error("Assistente selecionado não encontrado");
      return;
    }
    
    const assistantName = assistant.name || "Assistente";
    
    // Salvar o assistente selecionado no localStorage
    console.log("Salvando assistente no localStorage:", {id: selectedAssistantId, name: assistantName});
    localStorage.setItem('selected_assistant', JSON.stringify({
      id: selectedAssistantId,
      name: assistantName,
    }));
    
    console.log("Chamando onSelect com:", selectedAssistantId, assistantName);
    onSelect(selectedAssistantId, assistantName);
    onClose();
  };

  console.log("Estado atual do componente:", {
    isOpen,
    assistantsCount: assistants.length,
    selectedAssistantId,
    isLoading,
    error: error ? "Erro ao carregar" : null
  });

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md" onClick={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle>Selecionar Assistente Virtual</DialogTitle>
        </DialogHeader>
        
        {isLoading ? (
          <div className="flex justify-center p-6">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="py-6 text-center">
            <p className="text-destructive">Erro ao carregar assistentes</p>
            <Button variant="outline" size="sm" onClick={() => refetch()} className="mt-2">
              Tentar novamente
            </Button>
          </div>
        ) : assistants.length === 0 ? (
          <div className="py-6 text-center">
            <p className="text-muted-foreground">Nenhum assistente encontrado</p>
            <p className="text-sm mt-2">Crie um assistente na página de Treinamento</p>
          </div>
        ) : (
          <div className="py-4">
            <p className="text-sm text-muted-foreground mb-4">
              Selecione o assistente virtual que realizará a ligação para {client?.name || "o cliente"}
            </p>
            
            <RadioGroup 
              value={selectedAssistantId} 
              onValueChange={setSelectedAssistantId}
              className="space-y-3"
            >
              {assistants.map((assistant) => (
                <div 
                  key={assistant.id} 
                  className={`flex items-center justify-between space-x-2 rounded-lg border p-3 transition-colors ${
                    selectedAssistantId === assistant.id ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                  }`}
                  onClick={() => setSelectedAssistantId(assistant.id)}
                >
                  <div className="flex items-center space-x-3">
                    <RadioGroupItem value={assistant.id} id={assistant.id} />
                    <div className="flex flex-col">
                      <Label htmlFor={assistant.id} className="font-medium">
                        {assistant.name}
                      </Label>
                      {assistant.status && (
                        <span className="text-xs text-muted-foreground">
                          Status: {assistant.status === 'ready' ? 'Pronto' : assistant.status}
                        </span>
                      )}
                    </div>
                  </div>
                  <Bot className="h-5 w-5 text-muted-foreground" />
                </div>
              ))}
            </RadioGroup>
          </div>
        )}
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button 
            onClick={handleSelect} 
            disabled={isLoading || assistants.length === 0 || !selectedAssistantId}
          >
            <Phone className="h-4 w-4 mr-2" />
            Selecionar e Ligar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SelectAssistantDialog;
