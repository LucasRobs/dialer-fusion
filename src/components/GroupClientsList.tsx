import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from '@/components/ui/dialog';
import { 
  Table, 
  TableHeader, 
  TableRow, 
  TableHead, 
  TableBody, 
  TableCell 
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  X, 
  Search, 
  UserPlus, 
  Phone, 
  PlusCircle,
  Building
} from 'lucide-react';
import { toast } from 'sonner';
import { clientService } from '@/services/clientService';
import { supabase } from '@/lib/supabase';
import { webhookService } from '@/services/webhookService';

interface GroupClientsListProps {
  groupId: string;
  groupName: string;
  isOpen: boolean;
  onClose: () => void;
}

const GroupClientsList = ({ groupId, groupName, isOpen, onClose }: GroupClientsListProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddClientDialog, setShowAddClientDialog] = useState(false);
  
  const queryClient = useQueryClient();
  
  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('accounts')
          .select('*')
          .order('name', { ascending: true });
          
        if (error) throw error;
        return data || [];
      } catch (error) {
        console.error('Erro ao buscar contas:', error);
        return [];
      }
    },
    enabled: isOpen
  });
  
  const { data: clientsInGroup = [], isLoading: loadingGroupClients } = useQuery({
    queryKey: ['clientsInGroup', groupId],
    queryFn: () => clientService.getClientsByGroupId(groupId),
    enabled: isOpen && !!groupId
  });
  
  const { data: allClients = [], isLoading: loadingAllClients } = useQuery({
    queryKey: ['clientsForGroupSelection', groupId],
    queryFn: () => clientService.getClients(),
    enabled: showAddClientDialog && isOpen
  });
  
  const addClientToGroupMutation = useMutation({
    mutationFn: async (clientId: number) => {
      const { data, error } = await supabase
        .from('client_group_members')
        .insert({
          client_id: clientId,
          group_id: groupId
        })
        .select();
        
      if (error) {
        throw new Error(`Erro ao adicionar cliente ao grupo: ${error.message}`);
      }
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientsInGroup', groupId] });
      queryClient.invalidateQueries({ queryKey: ['clientGroups'] });
      toast.success('Cliente adicionado ao grupo com sucesso');
    },
    onError: (error: Error) => {
      toast.error(`Erro: ${error.message}`);
    }
  });
  
  const removeClientFromGroupMutation = useMutation({
    mutationFn: async (clientId: number) => {
      const { data, error } = await supabase
        .from('client_group_members')
        .delete()
        .eq('client_id', clientId)
        .eq('group_id', groupId)
        .select();
        
      if (error) {
        throw new Error(`Erro ao remover cliente do grupo: ${error.message}`);
      }
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientsInGroup', groupId] });
      queryClient.invalidateQueries({ queryKey: ['clientGroups'] });
      toast.success('Cliente removido do grupo com sucesso');
    },
    onError: (error: Error) => {
      toast.error(`Erro: ${error.message}`);
    }
  });
  
  const filteredClientsInGroup = clientsInGroup.filter(client => 
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.phone.includes(searchTerm) ||
    (client.email && client.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );
  
  const availableClients = allClients.filter(client => 
    !clientsInGroup.some(groupClient => groupClient.id === client.id) &&
    (client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
     client.phone.includes(searchTerm) ||
     (client.email && client.email.toLowerCase().includes(searchTerm.toLowerCase())))
  );
  
  const handleAddToGroup = (clientId: number) => {
    addClientToGroupMutation.mutate(clientId);
  };
  
  const handleRemoveFromGroup = (clientId: number) => {
    removeClientFromGroupMutation.mutate(clientId);
  };
  
  const handleCall = async (client: any) => {
    try {
      const { data } = await supabase.auth.getUser();
      const userId = data.user?.id;
      
      const result = await webhookService.triggerCallWebhook({
        action: 'start_call',
        campaign_id: 0,
        client_id: client.id,
        client_name: client.name,
        client_phone: client.phone,
        user_id: userId,
        account_id: client.account_id,
        additional_data: {
          source: 'group_view',
          group_id: groupId,
          group_name: groupName,
          vapi_caller_id: "97141b30-c5bc-4234-babb-d38b79452e2a",
          account_id: client.account_id
        }
      });
      
      if (result.success) {
        toast.success(`Iniciando ligação para ${client.name} (${client.phone})`);
      } else {
        toast.error("Não foi possível iniciar a ligação. Tente novamente.");
      }
    } catch (error) {
      console.error('Erro ao iniciar ligação:', error);
      toast.error("Ocorreu um erro ao tentar iniciar a ligação.");
    }
  };
  
  // Função para obter o nome da conta a partir do ID
  const getAccountName = (accountId: string) => {
    if (!accountId) return '-';
    const account = accounts.find(a => a.id === accountId);
    return account ? account.name : accountId;
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={open => {
      if (!open) onClose();
    }}>
      <DialogContent className="sm:max-w-4xl" onClick={e => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle>Clientes no Grupo: {groupName}</DialogTitle>
        </DialogHeader>
        
        <div className="flex items-center justify-between mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input 
              placeholder="Buscar clientes..." 
              className="pl-10" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          <Button onClick={() => setShowAddClientDialog(true)} className="ml-4">
            <UserPlus className="h-4 w-4 mr-2" />
            Adicionar Cliente
          </Button>
        </div>
        
        {loadingGroupClients ? (
          <div className="flex justify-center p-8">
            <div className="animate-spin h-8 w-8 border-b-2 border-primary rounded-full"></div>
          </div>
        ) : clientsInGroup.length === 0 ? (
          <div className="text-center p-8 border rounded-lg">
            <p className="text-lg text-muted-foreground mb-4">Este grupo não possui clientes</p>
            <Button onClick={() => setShowAddClientDialog(true)}>
              <UserPlus className="h-4 w-4 mr-2" />
              Adicionar Clientes
            </Button>
          </div>
        ) : filteredClientsInGroup.length === 0 ? (
          <div className="text-center p-8 border rounded-lg">
            <p className="text-lg text-muted-foreground">Nenhum cliente correspondente à pesquisa</p>
          </div>
        ) : (
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Conta</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredClientsInGroup.map(client => (
                  <TableRow key={client.id}>
                    <TableCell className="font-medium">{client.name}</TableCell>
                    <TableCell>{client.phone}</TableCell>
                    <TableCell>{client.email || '-'}</TableCell>
                    <TableCell>{client.account_id ? getAccountName(client.account_id) : '-'}</TableCell>
                    <TableCell>
                      <Badge variant={client.status === 'Active' ? 'default' : 'secondary'}>
                        {client.status || 'Active'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleCall(client)}
                          title="Ligar para cliente"
                        >
                          <Phone className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleRemoveFromGroup(client.id)}
                          className="text-destructive hover:text-destructive"
                          title="Remover do grupo"
                        >
                          <X className="h-4 w-4" />
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
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
      
      {/* Diálogo para adicionar clientes ao grupo */}
      <Dialog open={showAddClientDialog} onOpenChange={open => {
        if (!open) setShowAddClientDialog(false);
      }}>
        <DialogContent className="sm:max-w-4xl" onClick={e => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle>Adicionar Clientes ao Grupo</DialogTitle>
          </DialogHeader>
          
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input 
              placeholder="Buscar clientes disponíveis..." 
              className="pl-10" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          
          {loadingAllClients ? (
            <div className="flex justify-center p-8">
              <div className="animate-spin h-8 w-8 border-b-2 border-primary rounded-full"></div>
            </div>
          ) : availableClients.length === 0 ? (
            <div className="text-center p-8 border rounded-lg">
              <p className="text-lg text-muted-foreground">
                {searchTerm 
                  ? "Nenhum cliente disponível correspondente à pesquisa" 
                  : "Não há clientes disponíveis para adicionar ao grupo"
                }
              </p>
            </div>
          ) : (
            <div className="rounded-md border overflow-hidden max-h-96 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Conta</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {availableClients.map(client => (
                    <TableRow key={client.id}>
                      <TableCell className="font-medium">{client.name}</TableCell>
                      <TableCell>{client.phone}</TableCell>
                      <TableCell>{client.email || '-'}</TableCell>
                      <TableCell>{client.account_id ? getAccountName(client.account_id) : '-'}</TableCell>
                      <TableCell>
                        <Badge variant={client.status === 'Active' ? 'default' : 'secondary'}>
                          {client.status || 'Active'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleAddToGroup(client.id)}
                          title="Adicionar ao grupo"
                        >
                          <PlusCircle className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddClientDialog(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
};

export default GroupClientsList;
