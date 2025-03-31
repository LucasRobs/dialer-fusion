import React, { useState, useEffect } from 'react';
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
import { 
  MoreHorizontal, 
  Search, 
  Plus, 
  Pencil, 
  Trash2, 
  Phone,
  Check, 
  X,
  Filter,
  FileUp,
  RefreshCw
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
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
  const [selectedClient, setSelectedClient] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('Active');
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: clientGroups = [] } = useQuery({
    queryKey: ['clientGroups'],
    queryFn: () => clientGroupService.getClientGroups(),
  });
  
  const { data: clients = [], refetch } = useQuery({
    queryKey: ['clients', selectedGroupId],
    queryFn: () => selectedGroupId ? clientService.getClientsByGroupId(selectedGroupId) : clientService.getClients(),
  });
  
  const addClientMutation = useMutation({
    mutationFn: (clientData) => clientService.addClient(clientData),
    onSuccess: () => {
      queryClient.invalidateQueries(['clients']);
      toast({ title: 'Cliente adicionado', description: 'Cliente adicionado com sucesso.' });
      setShowNewClientDialog(false);
      clearForm();
    },
  });
  
  const updateClientMutation = useMutation({
    mutationFn: ({ id, client }) => clientService.updateClient(id, client),
    onSuccess: () => {
      queryClient.invalidateQueries(['clients']);
      toast({ title: 'Cliente atualizado', description: 'Cliente atualizado com sucesso.' });
      setShowEditClientDialog(false);
      clearForm();
    },
  });
  
  const deleteClientMutation = useMutation({
    mutationFn: async (id) => clientService.deleteClient(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['clients']);
      setTimeout(() => setShowDeleteClientDialog(false), 0);
      toast({ title: 'Cliente excluído', description: 'Cliente excluído com sucesso.' });
    },
  });
  
  const filteredClients = clients?.filter(client =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.phone.includes(searchTerm) ||
    client.email.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];
  
  const handleNew = (e) => {
    e.stopPropagation();
    setShowNewClientDialog(true);
  };
  
  const handleEdit = (e, client) => {
    e.stopPropagation();
    setSelectedClient(client);
    setName(client.name);
    setPhone(client.phone);
    setEmail(client.email || '');
    setStatus(client.status || 'Active');
    setShowEditClientDialog(true);
  };
  
  const handleDelete = (e, client) => {
    e.stopPropagation();
    setSelectedClient(client);
    setShowDeleteClientDialog(true);
  };
  
  const handleSubmitNew = async (e) => {
    e.preventDefault();
    addClientMutation.mutate({ name, phone, email, status });
  };
  
  const handleSubmitEdit = async (e) => {
    e.preventDefault();
    if (selectedClient) {
      updateClientMutation.mutate({ id: selectedClient.id, client: { name, phone, email, status } });
    }
  };
  
  const confirmDelete = async (e) => {
    e.preventDefault();
    if (selectedClient) {
      deleteClientMutation.mutate(selectedClient.id);
    }
  };
  
  const clearForm = () => {
    setName('');
    setPhone('');
    setEmail('');
    setStatus('Active');
    setSelectedClient(null);
  };

  return (
    <div className="container mx-auto p-4 max-w-6xl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Clientes</h1>
        <div className="flex space-x-2">
          <Select 
            value={selectedGroupId} 
            onValueChange={setSelectedGroupId}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filtrar por grupo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todos os grupos</SelectItem>
              {clientGroups.map(group => (
                <SelectItem key={group.id} value={group.id}>{group.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={handleNew}><Plus className="h-4 w-4 mr-2" />Adicionar Cliente</Button>
        </div>
      </div>
      
      <div className="mb-4">
        <Input 
          placeholder="Buscar clientes..." 
          value={searchTerm} 
          onChange={(e) => setSearchTerm(e.target.value)} 
          className="max-w-md"
        />
      </div>
      
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
          {filteredClients.map(client => (
            <TableRow key={client.id}>
              <TableCell>{client.name}</TableCell>
              <TableCell>{client.phone}</TableCell>
              <TableCell>{client.email}</TableCell>
              <TableCell>
              <Badge variant={client.status === 'Active' ? 'default' : 'destructive'}>
                {client.status === 'Active' ? 'Ativo' : 'Inativo'}
              </Badge>
              </TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={(e) => handleEdit(e, client)}>
                      <Pencil className="mr-2 h-4 w-4" />
                      Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={(e) => handleDelete(e, client)}>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Excluir
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      
      {/* Dialog para adicionar cliente */}
      {showNewClientDialog && (
        <Dialog open={showNewClientDialog} onOpenChange={setShowNewClientDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Adicionar Cliente</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmitNew}>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <label htmlFor="name" className="text-right">Nome</label>
                  <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="col-span-3" required />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <label htmlFor="phone" className="text-right">Telefone</label>
                  <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} className="col-span-3" required />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <label htmlFor="email" className="text-right">Email</label>
                  <Input id="email" value={email} onChange={(e) => setEmail(e.target.value)} className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <label htmlFor="status" className="text-right">Status</label>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Selecione o status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Active">Ativo</SelectItem>
                      <SelectItem value="Inactive">Inativo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowNewClientDialog(false)}>Cancelar</Button>
                <Button type="submit">Salvar</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
      
      {/* Dialog para editar cliente */}
      {showEditClientDialog && selectedClient && (
        <Dialog open={showEditClientDialog} onOpenChange={setShowEditClientDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Cliente</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmitEdit}>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <label htmlFor="edit-name" className="text-right">Nome</label>
                  <Input id="edit-name" value={name} onChange={(e) => setName(e.target.value)} className="col-span-3" required />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <label htmlFor="edit-phone" className="text-right">Telefone</label>
                  <Input id="edit-phone" value={phone} onChange={(e) => setPhone(e.target.value)} className="col-span-3" required />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <label htmlFor="edit-email" className="text-right">Email</label>
                  <Input id="edit-email" value={email} onChange={(e) => setEmail(e.target.value)} className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <label htmlFor="edit-status" className="text-right">Status</label>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Selecione o status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Active">Ativo</SelectItem>
                      <SelectItem value="Inactive">Inativo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowEditClientDialog(false)}>Cancelar</Button>
                <Button type="submit">Atualizar</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
      
      {/* Dialog para confirmar exclusão */}
      {showDeleteClientDialog && selectedClient && (
        <Dialog open={showDeleteClientDialog} onOpenChange={setShowDeleteClientDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirmar exclusão</DialogTitle>
            </DialogHeader>
            <p>Tem certeza que deseja excluir o cliente {selectedClient.name}?</p>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowDeleteClientDialog(false)}>Cancelar</Button>
              <Button type="button" variant="destructive" onClick={confirmDelete}>Excluir</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}