
import React, { useState } from 'react';
import { 
  Pencil, 
  Trash2, 
  Download, 
  Upload, 
  Search, 
  Plus,
  Phone,
  Loader2
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter,
  DialogTrigger
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Client, clientService } from '@/services/clientService';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const ClientList = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [newClient, setNewClient] = useState<Partial<Client>>({ name: '', phone: '', email: '', status: 'Active' });
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  
  const queryClient = useQueryClient();
  
  // Buscar clientes
  const { data: clients = [], isLoading, error } = useQuery({
    queryKey: ['clients'],
    queryFn: clientService.getClients
  });
  
  // Mutação para adicionar cliente
  const addClientMutation = useMutation({
    mutationFn: clientService.addClient,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['clientStats'] });
      toast.success('Cliente adicionado com sucesso');
      resetForm();
      setDialogOpen(false);
    },
    onError: (error: any) => {
      console.error('Erro ao adicionar cliente:', error);
      toast.error(`Erro ao adicionar cliente: ${error.message}`);
    }
  });
  
  // Mutação para atualizar cliente
  const updateClientMutation = useMutation({
    mutationFn: ({ id, client }: { id: number, client: Partial<Client> }) => 
      clientService.updateClient(id, client),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['clientStats'] });
      toast.success('Cliente atualizado com sucesso');
      resetForm();
      setDialogOpen(false);
    },
    onError: (error: any) => {
      console.error('Erro ao atualizar cliente:', error);
      toast.error(`Erro ao atualizar cliente: ${error.message}`);
    }
  });
  
  // Mutação para excluir cliente
  const deleteClientMutation = useMutation({
    mutationFn: clientService.deleteClient,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['clientStats'] });
      toast.success('Cliente removido com sucesso');
    },
    onError: (error: any) => {
      console.error('Erro ao excluir cliente:', error);
      toast.error(`Erro ao excluir cliente: ${error.message}`);
    }
  });

  const filteredClients = clients.filter(client => 
    client.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.phone?.includes(searchTerm) ||
    client.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleEdit = (client: Client) => {
    setEditingClient(client);
    setIsEditing(true);
    setDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    if (window.confirm('Tem certeza que deseja excluir este cliente?')) {
      deleteClientMutation.mutate(id);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isEditing && editingClient) {
      // Remover campos que não devem ser alterados
      const { id, name, phone, email, status } = editingClient;
      updateClientMutation.mutate({ 
        id, 
        client: { name, phone, email, status } 
      });
    } else {
      // Validação básica
      if (!newClient.name || !newClient.phone) {
        toast.error('Nome e telefone são obrigatórios');
        return;
      }
      
      addClientMutation.mutate(newClient as Omit<Client, 'id' | 'created_at' | 'updated_at'>);
    }
  };

  const handleExport = () => {
    toast.info('Exportação em desenvolvimento');
  };

  const handleImport = () => {
    toast.info('Importação em desenvolvimento');
  };

  const resetForm = () => {
    setNewClient({ name: '', phone: '', email: '', status: 'Active' });
    setEditingClient(null);
    setIsEditing(false);
  };

  const openAddDialog = () => {
    resetForm();
    setIsEditing(false);
    setDialogOpen(true);
  };

  if (error) {
    console.error("Erro ao carregar clientes:", error);
    return (
      <div className="container mx-auto p-4 max-w-7xl">
        <div className="flex justify-center items-center h-40">
          <div className="text-center">
            <p className="text-red-500 mb-2">Erro ao carregar clientes</p>
            <Button 
              onClick={() => queryClient.invalidateQueries({ queryKey: ['clients'] })}
              variant="outline"
            >
              Tentar novamente
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-7xl">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <h1 className="text-3xl font-bold mb-4 md:mb-0">Base de Clientes</h1>
        
        <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar clientes..."
              className="pl-8 w-full"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleExport} className="whitespace-nowrap">
              <Download className="mr-2 h-4 w-4" />
              Exportar
            </Button>
            <Button variant="outline" size="sm" onClick={handleImport} className="whitespace-nowrap">
              <Upload className="mr-2 h-4 w-4" />
              Importar
            </Button>
            <Button size="sm" onClick={openAddDialog} className="whitespace-nowrap">
              <Plus className="mr-2 h-4 w-4" />
              Adicionar Cliente
            </Button>
          </div>
        </div>
      </div>
      
      <div className="border rounded-lg overflow-hidden glass">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">#</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead className="hidden md:table-cell">Email</TableHead>
              <TableHead className="hidden md:table-cell">Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  <div className="flex justify-center items-center">
                    <Loader2 className="h-6 w-6 animate-spin mr-2 text-primary" />
                    <span>Carregando clientes...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : filteredClients.length > 0 ? (
              filteredClients.map((client) => (
                <TableRow key={client.id}>
                  <TableCell className="font-medium">{client.id}</TableCell>
                  <TableCell>{client.name}</TableCell>
                  <TableCell>{client.phone}</TableCell>
                  <TableCell className="hidden md:table-cell">{client.email}</TableCell>
                  <TableCell className="hidden md:table-cell">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      client.status === 'Active' 
                        ? 'bg-secondary/20 text-secondary' 
                        : 'bg-muted text-muted-foreground'
                    }`}>
                      {client.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(client)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => handleDelete(client.id)}
                        disabled={deleteClientMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon">
                        <Phone className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  Nenhum cliente encontrado. Ajuste sua busca ou adicione novos clientes.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      
      {/* Add/Edit Client Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{isEditing ? 'Editar Cliente' : 'Adicionar Novo Cliente'}</DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4 pt-4">
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome Completo</Label>
                <Input
                  id="name"
                  placeholder="João Silva"
                  value={isEditing ? editingClient?.name || '' : newClient.name}
                  onChange={(e) => isEditing 
                    ? setEditingClient({...editingClient!, name: e.target.value})
                    : setNewClient({...newClient, name: e.target.value})
                  }
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="phone">Número de Telefone</Label>
                <Input
                  id="phone"
                  placeholder="(11) 99999-9999"
                  value={isEditing ? editingClient?.phone || '' : newClient.phone}
                  onChange={(e) => isEditing 
                    ? setEditingClient({...editingClient!, phone: e.target.value})
                    : setNewClient({...newClient, phone: e.target.value})
                  }
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">Endereço de E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="joao.silva@exemplo.com"
                  value={isEditing ? editingClient?.email || '' : newClient.email}
                  onChange={(e) => isEditing 
                    ? setEditingClient({...editingClient!, email: e.target.value})
                    : setNewClient({...newClient, email: e.target.value})
                  }
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <select
                  id="status"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={isEditing ? editingClient?.status || 'Active' : newClient.status}
                  onChange={(e) => isEditing 
                    ? setEditingClient({...editingClient!, status: e.target.value})
                    : setNewClient({...newClient, status: e.target.value})
                  }
                >
                  <option value="Active">Ativo</option>
                  <option value="Inactive">Inativo</option>
                </select>
              </div>
            </div>
            
            <DialogFooter className="pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => {
                  resetForm();
                  setDialogOpen(false);
                }}
                disabled={addClientMutation.isPending || updateClientMutation.isPending}
              >
                Cancelar
              </Button>
              <Button 
                type="submit"
                disabled={addClientMutation.isPending || updateClientMutation.isPending}
              >
                {(addClientMutation.isPending || updateClientMutation.isPending) && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {isEditing ? 'Salvar Alterações' : 'Adicionar Cliente'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ClientList;
