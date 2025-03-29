
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
import { Trash2 } from 'lucide-react';
import { ClientGroup, clientGroupService } from '@/services/clientGroupService';
import { toast } from 'sonner';

interface DeleteGroupDialogProps {
  isOpen: boolean;
  onClose: () => void;
  selectedGroup: ClientGroup | null;
}

const DeleteGroupDialog = ({ isOpen, onClose, selectedGroup }: DeleteGroupDialogProps) => {
  const queryClient = useQueryClient();
  
  const deleteGroupMutation = useMutation({
    mutationFn: async (id: string) => {
      return await clientGroupService.deleteClientGroup(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientGroups'] });
      toast.success('Grupo excluído com sucesso');
      onClose();
    },
    onError: (error: Error) => {
      toast.error(`Erro ao excluir grupo: ${error.message}`);
    }
  });
  
  const confirmDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (selectedGroup) {
      deleteGroupMutation.mutate(selectedGroup.id);
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) onClose();
    }}>
      <DialogContent className="sm:max-w-md" onClick={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle>Excluir Grupo</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <p>Tem certeza de que deseja excluir este grupo?</p>
          {selectedGroup && selectedGroup.client_count && selectedGroup.client_count > 0 && (
            <p className="text-amber-500 mt-2">
              Atenção: Este grupo contém {selectedGroup.client_count} clientes. 
              A exclusão do grupo não excluirá os clientes.
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}>
            Cancelar
          </Button>
          <Button variant="destructive" onClick={confirmDelete}>
            <Trash2 className="h-4 w-4 mr-2" />
            Excluir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DeleteGroupDialog;
