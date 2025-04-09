import React, { useState } from 'react';
import { 
  Table, 
  TableHeader, 
  TableRow, 
  TableHead, 
  TableBody, 
  TableCell 
} from '@/components/ui/table';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { 
  MoreHorizontal, 
  Search, 
  Plus, 
  Pencil, 
  Trash2, 
  Phone,
  Filter,
  FileUp,
  RefreshCw,
  Building,
  UserPlus
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { clientService } from '@/services/clientService';
import { webhookService } from '@/services/webhookService';
import { supabase } from '@/lib/supabase';
import ClientGroupRelation from './ClientGroupRelation';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { clientGroupService } from '@/services/clientGroupService';
import ImportClientsSheet from './ImportClientsSheet';

export default function ClientList() {
  const [showNewClientDialog, setShowNewClientDialog] = useState(false);
  const [showEditClientDialog, setShowEditClientDialog] = useState(false);
  const [showDeleteClientDialog, setShowDeleteClientDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('Active');
  const [accountId, setAccountId] = useState('');
  const [newClientGroupId, setNewClientGroupId] = useState<string>('none');
  
  const queryClient = useQueryClient();
  
  // Consulta de contas para o filtro de contas
  const { 
    data: accounts = [], 
    isLoading: isLoadingAccounts 
  } = useQuery({
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
    }
  });
  
  const { 
    data: clientGroups = [], 
    isLoading: isLoadingGroups
  } = useQuery({
    queryKey: ['clientGroups'],
    queryFn: () => clientGroupService.getClientGroups(),
  });
  
  const { 
    data: clients = [], 
    isLoading, 
    error, 
    refetch 
  } = useQuery({
    queryKey: ['clients', selectedGroupId, selectedAccountId],
    queryFn: async () => {
      if (selectedGroupId && selectedGroupId !== 'all-clients') {
        return clientService.getClientsByGroupId(selectedGroupId);
      }
      
      if (selectedAccountId && selectedAccountId !== 'all-accounts') {
        return clientService.getClientsByAccount(selectedAccountId);
      }
      
      return clientService.getClients();
    },
  });
  
  const addClientMutation = useMutation({
    mutationFn: ({ clientData, groupId }: { clientData: any, groupId?: string }) => {
      if (groupId && groupId !== 'none') {
        return clientService.addClientWithGroup(clientData, groupId);
      }
      return clientService.addClient(clientData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      if (newClientGroupId && newClientGroupId !== 'none') {
        queryClient.invalidateQueries({ queryKey: ['clientGroups'] });
      }
      toast.success("Cliente adicionado com sucesso.");
      setShowNewClientDialog(false);
      clearForm();
    },
    onError: (error: Error) => {
      toast.error(`Erro ao adicionar cliente: ${error.message}`);
    },
  });

  const getGroupName = (groupId: string) => {
    if (groupId === 'none') return 'Sem grupo';
    const group = clientGroups.find(g => g.id === groupId);
    return group ? group.name : 'Selecione um grupo (opcional)';
  };
  
  
  const updateClientMutation = useMutation({
    mutationFn: (data: { id: number; client: { name: string; phone: string; email: string; status: string; account_id?: string } }) => 
      clientService.updateClient(data.id, data.client),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast.success("Cliente atualizado com sucesso");
      setShowEditClientDialog(false);
      clearForm();
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar cliente: ${error.message || "Ocorreu um erro ao atualizar o cliente."}`);
    },
  });
  
  const deleteClientMutation = useMutation({
    mutationFn: (id: number) => clientService.deleteClient(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast.success("Cliente excluído com sucesso");
      setShowDeleteClientDialog(false);
      clearForm();
    },
    onError: (error: Error) => {
      toast.error(`Erro ao excluir cliente: ${error.message || "Ocorreu um erro ao excluir o cliente."}`);
    },
  });
  
  const filteredClients = clients?.filter(client =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.phone.includes(searchTerm) ||
    client.email.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];
  
  const handleNew = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowNewClientDialog(true);
  };
  
  const handleEdit = (e: React.MouseEvent, client: any) => {
    e.stopPropagation();
    e.preventDefault();
    setSelectedClient(client);
    setName(client.name);
    setPhone(client.phone);
    setEmail(client.email || '');
    setStatus(client.status || 'Active');
    setAccountId(client.account_id || '');
    setShowEditClientDialog(true);
  };
  
  const handleDelete = (e: React.MouseEvent, client: any) => {
    e.stopPropagation();
    e.preventDefault();
    setSelectedClient(client);
    setShowDeleteClientDialog(true);
  };
  
  const handleSubmitNew = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const clientData = { 
      name, 
      phone, 
      status: 'Active'  // Simplificado para sempre 'Active'
    };
    
    addClientMutation.mutate({ 
      clientData, 
      groupId: newClientGroupId
    });
  };
  
  const handleSubmitEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (selectedClient) {
      const clientData = { name, phone, email, status };
      
      // Adicionar account_id se selecionado
      if (accountId) {
        Object.assign(clientData, { account_id: accountId });
      }
      
      updateClientMutation.mutate({ 
        id: selectedClient.id, 
        client: clientData
      });
    }
  };
  
  const confirmDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (selectedClient) {
      deleteClientMutation.mutate(selectedClient.id);
    }
  };
  
  const clearForm = () => {
    setName('');
    setPhone('');
    setEmail('');
    setStatus('Active');
    setAccountId('');
    setNewClientGroupId('none');
    setSelectedClient(null);
  };

  const handleCall = async (e: React.MouseEvent, client: any) => {
    e.stopPropagation();
    e.preventDefault();
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
          source: 'client_list',
          client_email: client.email,
          client_status: client.status,
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

  const handleImportClients = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowImportDialog(true);
  };

  const handleGroupFilterChange = (value: string) => {
    setSelectedGroupId(value);
    // Limpar o filtro de conta se um grupo for selecionado
    if (value && value !== 'all-clients') {
      setSelectedAccountId('');
    }
  };

  const handleAccountFilterChange = (value: string) => {
    setSelectedAccountId(value);
    // Limpar o filtro de grupo se uma conta for selecionada
    if (value && value !== 'all-accounts') {
      setSelectedGroupId('');
    }
  };

  // Encontrar o nome da conta para exibição
  const getAccountName = (accountId: string) => {
    if (!accountId) return '-';
    const account = accounts.find(acc => acc.id === accountId);
    return account ? account.name : accountId;
  };

  return (
    <div className="container mx-auto p-4 max-w-6xl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Clientes</h1>
        <div className="flex gap-2">
          <Button onClick={handleImportClients}>
            <FileUp className="h-4 w-4 mr-2" />
            Importar Clientes
          </Button>
          <Button onClick={handleNew}>
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Cliente
          </Button>
        </div>
      </div>
      
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input 
            placeholder="Buscar clientes..." 
            className="pl-10" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="w-full md:w-64">
          <Select
            value={selectedGroupId}
            onValueChange={handleGroupFilterChange}
          >
            <SelectTrigger className="w-full">
              <div className="flex items-center">
                <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Filtrar por grupo" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all-clients">Todos os clientes</SelectItem>
              {clientGroups.map((group) => (
                <SelectItem key={group.id} value={group.id}>
                  {group.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="w-full md:w-64">
          <Select
            value={selectedAccountId}
            onValueChange={handleAccountFilterChange}
          >
            <SelectTrigger className="w-full">
              <div className="flex items-center">
                <Building className="h-4 w-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Filtrar por conta" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all-accounts">Todas as contas</SelectItem>
              {accounts.map((account) => (
                <SelectItem key={account.id} value={account.id}>
                  {account.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <Button 
          variant="outline" 
          size="icon"
          onClick={() => refetch()}
          title="Atualizar lista"
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>
      
      {isLoading ? (
        <div className="flex justify-center p-8">
          <div className="animate-spin h-8 w-8 border-b-2 border-primary rounded-full"></div>
        </div>
      ) : error ? (
        <div className="p-8 text-center">
          <p className="text-red-500">Erro ao carregar clientes: {error instanceof Error ? error.message : 'Erro desconhecido'}</p>
          <Button onClick={() => refetch()} variant="outline" className="mt-4">
            Tentar novamente
          </Button>
        </div>
      ) : clients.length === 0 ? (
        <div className="text-center p-8 border rounded-lg">
          <p className="text-lg text-muted-foreground mb-4">
            {selectedGroupId 
              ? "Este grupo não possui clientes" 
              : selectedAccountId
                ? "Esta conta não possui clientes"
                : "Nenhum cliente encontrado"
            }
          </p>
          {!selectedGroupId && !selectedAccountId && (
            <Button onClick={handleNew}>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar seu primeiro cliente
            </Button>
          )}
        </div>
      ) : filteredClients.length === 0 ? (
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
              {filteredClients.map((client) => (
                <TableRow key={client.id}>
                  <TableCell className="font-medium">{client.name}</TableCell>
                  <TableCell>{client.phone}</TableCell>
                  <TableCell>{client.email || '-'}</TableCell>
                  <TableCell>{client.account_id ? getAccountName(client.account_id) : '-'}</TableCell>
                  <TableCell>
                    <Badge variant={client.status === 'Active' ? 'default' : 'secondary'}>
                      {client.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <ClientGroupRelation client={client} />
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={(e) => handleCall(e, client)}
                        title="Ligar para cliente"
                      >
                        <Phone className="h-4 w-4" />
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" onClick={(e) => e.stopPropagation()}>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                          <DropdownMenuItem onClick={(e) => handleEdit(e, client)}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={(e) => handleDelete(e, client)}>
                            <Trash2 className="h-4 w-4 mr-2" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      
      <Dialog open={showNewClientDialog} onOpenChange={(open) => {
        if (!open) clearForm();
        setShowNewClientDialog(open);
      }}>
        <DialogContent className="sm:max-w-md" onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle>Adicionar Novo Cliente</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmitNew} className="space-y-4">
            <div>
              <Input 
                placeholder="Nome" 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                required 
                onClick={(e) => e.stopPropagation()}
              />
            </div>
            <div>
              <Input 
                placeholder="Telefone" 
                value={phone} 
                onChange={(e) => setPhone(e.target.value)} 
                required 
                onClick={(e) => e.stopPropagation()}
              />
            </div>
            <div>
  <Select
    value={newClientGroupId}
    onValueChange={setNewClientGroupId}
  >
    <SelectTrigger className="w-full">
      <div className="flex items-center">
      {getGroupName(newClientGroupId)}
      </div>
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="none">Sem grupo</SelectItem>
      {clientGroups?.map((group) => (
        <SelectItem key={group.id} value={group.id}>
          {group.name}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
</div>
            <DialogFooter>
              <Button type="submit" onClick={(e) => e.stopPropagation()}>
                <UserPlus className="h-4 w-4 mr-2" />
                Adicionar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      
      <Dialog open={showEditClientDialog} onOpenChange={(open) => {
        if (!open) clearForm();
        setShowEditClientDialog(open);
      }}>
        <DialogContent className="sm:max-w-md" onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle>Editar Cliente</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmitEdit} className="space-y-4">
            <div>
              <Input 
                placeholder="Nome" 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                required 
                onClick={(e) => e.stopPropagation()}
              />
            </div>
            <div>
              <Input 
                placeholder="Telefone" 
                value={phone} 
                onChange={(e) => setPhone(e.target.value)} 
                required 
                onClick={(e) => e.stopPropagation()}
              />
            </div>
            <div>
              <Input 
                placeholder="Email" 
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                onClick={(e) => e.stopPropagation()}
              />
            </div>
            <div>
              <select 
                className="w-full border rounded-md py-2 px-3"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                onClick={(e) => e.stopPropagation()}
              >
                <option value="Active">Ativo</option>
                <option value="Inactive">Inativo</option>
              </select>
            </div>
            <div>
  <Select
    value={accountId}
    onValueChange={setAccountId}
  >
    <SelectTrigger className="w-full">
      <div className="flex items-center">
        {accountId === 'none' || !accountId
          ? 'Sem conta' 
          : accounts?.find(account => account.id === accountId)?.name || 'Selecione uma conta (opcional)'}
      </div>
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="none">Sem conta</SelectItem>
      {accounts.map((account) => (
        <SelectItem key={account.id} value={account.id}>
          {account.name}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
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
      
      <Dialog open={showDeleteClientDialog} onOpenChange={(open) => {
        if (!open) setSelectedClient(null);
        setShowDeleteClientDialog(open);
      }}>
        <DialogContent className="sm:max-w-md" onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle>Excluir Cliente</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p>Tem certeza de que deseja excluir este cliente?</p>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={(e) => {
              e.stopPropagation();
              setShowDeleteClientDialog(false);
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

      <ImportClientsSheet 
        isOpen={showImportDialog}
        onClose={() => setShowImportDialog(false)}
      />
    </div>
  );
}
