
import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription 
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
  const [isProcessing, setIsProcessing] = useState(false);
  
  const deleteGroupMutation = useMutation({
    mutationFn: async (id: string) => {
      setIsProcessing(true);
      return await clientGroupService.deleteClientGroup(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientGroups'] });
      queryClient.invalidateQueries({ queryKey: ['clientGroupMemberships'] });
      toast.success('Grupo excluído com sucesso');
      setIsProcessing(false);
      onClose();
    },
    onError: (error: Error) => {
      toast.error(`Erro ao excluir grupo: ${error.message}`);
      setIsProcessing(false);
    }
  });
  
  const confirmDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (selectedGroup && !isProcessing) {
      deleteGroupMutation.mutate(selectedGroup.id);
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open && !isProcessing) onClose();
    }}>
      <DialogContent className="sm:max-w-md" onClick={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle>Excluir Grupo</DialogTitle>
          <DialogDescription>
            Esta ação não pode ser desfeita.
          </DialogDescription>
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
            if (!isProcessing) onClose();
          }}
          disabled={isProcessing}>
            Cancelar
          </Button>
          <Button variant="destructive" onClick={confirmDelete} disabled={isProcessing}>
            {isProcessing ? (
              <div className="flex items-center">
                <div className="animate-spin h-4 w-4 mr-2 border-b-2 border-white rounded-full"></div>
                Excluindo...
              </div>
            ) : (
              <>
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DeleteGroupDialog;
