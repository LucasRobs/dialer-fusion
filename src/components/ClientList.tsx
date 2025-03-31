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
    e.preventDefault();
    setSelectedClient(client);
    setName(client.name);
    setPhone(client.phone);
    setEmail(client.email || '');
    setStatus(client.status || 'Active');
    setShowEditClientDialog(true);
  };
  
  const handleDelete = (e, client) => {
    e.stopPropagation();
    e.preventDefault();
    setSelectedClient(client);
    setShowDeleteClientDialog(true);
  };
  
  const handleSubmitNew = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    addClientMutation.mutate({ name, phone, email, status });
  };
  
  const handleSubmitEdit = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (selectedClient) {
      updateClientMutation.mutate({ id: selectedClient.id, client: { name, phone, email, status } });
    }
  };
  
  const confirmDelete = async (e) => {
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
    setSelectedClient(null);
  };

  return (
    <div className="container mx-auto p-4 max-w-6xl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Clientes</h1>
        <Button onClick={handleNew}><Plus className="h-4 w-4 mr-2" />Adicionar Cliente</Button>
      </div>
      <Input placeholder="Buscar clientes..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Telefone</TableHead>
            <TableHead>Email</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredClients.map(client => (
            <TableRow key={client.id}>
              <TableCell>{client.name}</TableCell>
              <TableCell>{client.phone}</TableCell>
              <TableCell>{client.email}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}