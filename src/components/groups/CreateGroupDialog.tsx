
import React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus } from 'lucide-react';
import { clientGroupService } from '@/services/clientGroupService';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

interface CreateGroupDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const CreateGroupDialog = ({ isOpen, onClose }: CreateGroupDialogProps) => {
  const [groupName, setGroupName] = React.useState('');
  const [groupDescription, setGroupDescription] = React.useState('');
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const createGroupMutation = useMutation({
    mutationFn: async (groupData: { name: string; description: string }) => {
      return await clientGroupService.createClientGroup({ 
        name: groupData.name,
        description: groupData.description,
        user_id: user?.id || ''
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientGroups'] });
      toast.success('Grupo criado com sucesso');
      onClose();
      clearForm();
    },
    onError: (error: Error) => {
      toast.error(`Erro ao criar grupo: ${error.message}`);
    }
  });
  
  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    createGroupMutation.mutate({ 
      name: groupName, 
      description: groupDescription 
    });
  };
  
  const clearForm = () => {
    setGroupName('');
    setGroupDescription('');
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) clearForm();
      onClose();
    }}>
      <DialogContent className="sm:max-w-md" onClick={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle>Criar Novo Grupo</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <Input 
              placeholder="Nome do grupo" 
              value={groupName} 
              onChange={(e) => setGroupName(e.target.value)} 
              required 
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          <div>
            <Input 
              placeholder="Descrição (opcional)" 
              value={groupDescription} 
              onChange={(e) => setGroupDescription(e.target.value)} 
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          <DialogFooter>
            <Button type="submit" onClick={(e) => e.stopPropagation()}>
              <Plus className="h-4 w-4 mr-2" />
              Criar Grupo
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateGroupDialog;
