
import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import assistantService from '@/services/assistantService';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Bot } from 'lucide-react';
import { toast } from 'sonner';

interface AssistantSelectorProps {
  onAssistantSelected?: (assistant: any) => void;
}

const AssistantSelector = ({ onAssistantSelected }: AssistantSelectorProps) => {
  const [selectedAssistantId, setSelectedAssistantId] = useState<string>('');
  const { user } = useAuth();
  
  // Fetch assistants
  const { data: assistants = [], isLoading } = useQuery({
    queryKey: ['assistants', user?.id],
    queryFn: () => assistantService.getAllAssistants(user?.id),
  });
  
  // Load selected assistant from localStorage on mount
  useEffect(() => {
    try {
      const storedAssistant = localStorage.getItem('selected_assistant');
      if (storedAssistant) {
        const assistant = JSON.parse(storedAssistant);
        setSelectedAssistantId(assistant.assistant_id);
        if (onAssistantSelected) {
          onAssistantSelected(assistant);
        }
      } else if (assistants && assistants.length > 0) {
        // Filter out pending assistants
        const readyAssistants = assistants.filter(asst => asst.status !== 'pending');
        if (readyAssistants.length > 0) {
          setSelectedAssistantId(readyAssistants[0].assistant_id);
          localStorage.setItem('selected_assistant', JSON.stringify(readyAssistants[0]));
          if (onAssistantSelected) {
            onAssistantSelected(readyAssistants[0]);
          }
        }
      }
    } catch (error) {
      console.error("Erro ao carregar assistente selecionado:", error);
    }
  }, [assistants, onAssistantSelected]);
  
  const handleAssistantChange = async (assistantId: string) => {
    try {
      const assistant = assistants.find(a => a.assistant_id === assistantId);
      if (assistant) {
        setSelectedAssistantId(assistantId);
        localStorage.setItem('selected_assistant', JSON.stringify(assistant));
        if (onAssistantSelected) {
          onAssistantSelected(assistant);
        }
        toast.success(`Assistente ${assistant.name} selecionado com sucesso`);
      }
    } catch (error) {
      console.error("Erro ao selecionar assistente:", error);
      toast.error("Erro ao selecionar assistente");
    }
  };
  
  const readyAssistants = assistants.filter(asst => asst.status !== 'pending');
  
  return (
    <div className="flex items-center space-x-2">
      <Select
        value={selectedAssistantId}
        onValueChange={handleAssistantChange}
        disabled={isLoading || readyAssistants.length === 0}
      >
        <SelectTrigger className="w-[200px]">
          <div className="flex items-center">
            <Bot className="h-4 w-4 mr-2 text-muted-foreground" />
            <SelectValue placeholder="Selecionar assistente" />
          </div>
        </SelectTrigger>
        <SelectContent>
          {isLoading ? (
            <SelectItem value="loading" disabled>
              Carregando assistentes...
            </SelectItem>
          ) : readyAssistants.length === 0 ? (
            <SelectItem value="none" disabled>
              Nenhum assistente disponível
            </SelectItem>
          ) : (
            readyAssistants.map((assistant) => (
              <SelectItem key={assistant.assistant_id} value={assistant.assistant_id}>
                {assistant.name}
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>
    </div>
  );
};

export default AssistantSelector;
