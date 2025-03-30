
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Phone, X } from 'lucide-react';
import { Client } from '@/services/clientService';
import { clientGroupService } from '@/services/clientGroupService';
import { toast } from 'sonner';
import { webhookService } from '@/services/webhookService';
import { supabase } from '@/lib/supabase';

interface GroupClientsListProps {
  groupId: string;
  groupName: string;
  isOpen: boolean;
  onClose: () => void;
}

const GroupClientsList = ({ groupId, groupName, isOpen, onClose }: GroupClientsListProps) => {
  const queryClient = useQueryClient();
  const [isProcessingRemove, setIsProcessingRemove] = useState<number | null>(null);
  const [isProcessingCall, setIsProcessingCall] = useState<number | null>(null);
  
  const { 
    data: clients = [], 
    isLoading, 
    error,
    refetch
  } = useQuery({
    queryKey: ['clientsInGroup', groupId],
    queryFn: () => clientGroupService.getClientsInGroup(groupId),
    enabled: !!groupId && isOpen,
    staleTime: 10000 // 10 segundos
  });

  const removeFromGroupMutation = useMutation({
    mutationFn: async ({ clientId, groupId }: { clientId: number, groupId: string }) => {
      setIsProcessingRemove(clientId);
      return await clientGroupService.removeClientFromGroup(clientId, groupId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientsInGroup'] });
      queryClient.invalidateQueries({ queryKey: ['clientGroups'] });
      queryClient.invalidateQueries({ queryKey: ['clientGroupMemberships'] });
      toast("Cliente removido do grupo com sucesso.");
      setIsProcessingRemove(null);
      refetch();
    },
    onError: (error: Error) => {
      toast("Erro ao remover cliente do grupo.");
      setIsProcessingRemove(null);
    }
  });

  const handleRemoveFromGroup = async (clientId: number) => {
    if (isProcessingRemove === null) {
      removeFromGroupMutation.mutate({ clientId, groupId });
    }
  };

  const handleCall = async (client: Client) => {
    try {
      if (isProcessingCall !== null) return;
      
      setIsProcessingCall(client.id);
      const { data } = await supabase.auth.getUser();
      const userId = data.user?.id;
      
      const result = await webhookService.triggerCallWebhook({
        action: 'start_call',
        client_id: client.id,
        client_name: client.name,
        client_phone: client.phone,
        user_id: userId,
        additional_data: {
          source: 'group_list',
          client_email: client.email,
          client_status: client.status,
          vapi_caller_id: "97141b30-c5bc-4234-babb-d38b79452e2a"
        }
      });
      
      if (result.success) {
        toast(`Iniciando ligação para ${client.name} (${client.phone})`);
      } else {
        toast("Não foi possível iniciar a ligação. Tente novamente.");
      }
      setIsProcessingCall(null);
    } catch (error) {
      console.error('Erro ao iniciar ligação:', error);
      toast("Ocorreu um erro ao tentar iniciar a ligação.");
      setIsProcessingCall(null);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(shouldClose) => {
      // Só fecha o diálogo se não houver operação em andamento
      if (isProcessingRemove === null && isProcessingCall === null && shouldClose === false) {
        onClose();
      }
    }}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Clientes no grupo: {groupName}</DialogTitle>
          <DialogDescription>
            Gerencie os clientes no grupo {groupName}
          </DialogDescription>
        </DialogHeader>
        
        {isLoading ? (
          <div className="flex justify-center p-6">
            <div className="animate-spin h-8 w-8 border-b-2 border-primary rounded-full"></div>
          </div>
        ) : error ? (
          <div className="text-center p-6 text-red-500">
            Erro ao carregar clientes: {error instanceof Error ? error.message : 'Erro desconhecido'}
          </div>
        ) : clients.length === 0 ? (
          <div className="text-center p-6 text-muted-foreground">
            Este grupo não possui clientes
          </div>
        ) : (
          <div className="overflow-auto max-h-[60vh]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clients.map((client) => (
                  <TableRow key={client.id}>
                    <TableCell className="font-medium">{client.name}</TableCell>
                    <TableCell>{client.phone}</TableCell>
                    <TableCell>{client.email}</TableCell>
                    <TableCell>
                      <Badge variant={client.status === 'Active' ? 'default' : 'secondary'}>
                        {client.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCall(client);
                          }}
                          title="Ligar para cliente"
                          disabled={isProcessingCall === client.id || isProcessingRemove === client.id}
                        >
                          {isProcessingCall === client.id ? (
                            <div className="animate-spin h-4 w-4 border-b-2 border-primary rounded-full"></div>
                          ) : (
                            <Phone className="h-4 w-4" />
                          )}
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="text-destructive hover:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveFromGroup(client.id);
                          }}
                          title="Remover do grupo"
                          disabled={isProcessingRemove === client.id || isProcessingCall === client.id}
                        >
                          {isProcessingRemove === client.id ? (
                            <div className="animate-spin h-4 w-4 border-b-2 border-destructive rounded-full"></div>
                          ) : (
                            <X className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        
        <DialogFooter>
          <Button onClick={onClose} disabled={isProcessingRemove !== null || isProcessingCall !== null}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default GroupClientsList;
