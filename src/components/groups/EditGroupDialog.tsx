
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
import { Pencil } from 'lucide-react';
import { ClientGroup, clientGroupService } from '@/services/clientGroupService';
import { toast } from 'sonner';

interface EditGroupDialogProps {
  isOpen: boolean;
  onClose: () => void;
  selectedGroup: ClientGroup | null;
}

const EditGroupDialog = ({ isOpen, onClose, selectedGroup }: EditGroupDialogProps) => {
  const [groupName, setGroupName] = React.useState('');
  const [groupDescription, setGroupDescription] = React.useState('');
  const queryClient = useQueryClient();
  
  React.useEffect(() => {
    if (selectedGroup) {
      setGroupName(selectedGroup.name);
      setGroupDescription(selectedGroup.description || '');
    }
  }, [selectedGroup]);
  
  const updateGroupMutation = useMutation({
    mutationFn: async (groupData: { id: string; name: string; description: string }) => {
      return await clientGroupService.updateClientGroup(groupData.id, { 
        name: groupData.name,
        description: groupData.description
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientGroups'] });
      toast.success('Grupo atualizado com sucesso');
      onClose();
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar grupo: ${error.message}`);
    }
  });
  
  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (selectedGroup) {
      updateGroupMutation.mutate({
        id: selectedGroup.id,
        name: groupName,
        description: groupDescription
      });
    }
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
          <DialogTitle>Editar Grupo</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleUpdate} className="space-y-4">
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
              <Pencil className="h-4 w-4 mr-2" />
              Salvar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditGroupDialog;
