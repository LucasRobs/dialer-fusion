
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
  X 
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { clientService } from '@/services/clientService';
import { webhookService } from '@/services/webhookService';
import { supabase } from '@/lib/supabase';

export default function ClientList() {
  const [showNewClientDialog, setShowNewClientDialog] = useState(false);
  const [showEditClientDialog, setShowEditClientDialog] = useState(false);
  const [showDeleteClientDialog, setShowDeleteClientDialog] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('Active');
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { 
    data: clients = [], 
    isLoading, 
    error, 
    refetch 
  } = useQuery({
    queryKey: ['clients'],
    queryFn: () => clientService.getClients(),
  });
  
  const addClientMutation = useMutation({
    mutationFn: (clientData: { name: string; phone: string; email: string; status: string }) => 
      clientService.addClient(clientData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast({
        title: "Cliente adicionado",
        description: "Cliente adicionado com sucesso.",
      });
      setShowNewClientDialog(false);
      clearForm();
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao adicionar cliente",
        description: error.message || "Ocorreu um erro ao adicionar o cliente.",
        variant: "destructive",
      });
    },
  });
  
  const updateClientMutation = useMutation({
    mutationFn: (data: { id: number; client: { name: string; phone: string; email: string; status: string } }) => 
      clientService.updateClient(data.id, data.client),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast({
        title: "Cliente atualizado",
        description: "Cliente atualizado com sucesso.",
      });
      setShowEditClientDialog(false);
      clearForm();
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar cliente",
        description: error.message || "Ocorreu um erro ao atualizar o cliente.",
        variant: "destructive",
      });
    },
  });
  
  const deleteClientMutation = useMutation({
    mutationFn: (id: number) => clientService.deleteClient(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast({
        title: "Cliente excluído",
        description: "Cliente excluído com sucesso.",
      });
      setShowDeleteClientDialog(false);
      clearForm();
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao excluir cliente",
        description: error.message || "Ocorreu um erro ao excluir o cliente.",
        variant: "destructive",
      });
    },
  });
  
  const filteredClients = clients?.filter(client =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.phone.includes(searchTerm) ||
    client.email.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];
  
  const handleNew = () => {
    setShowNewClientDialog(true);
  };
  
  const handleEdit = (client: any) => {
    setSelectedClient(client);
    setName(client.name);
    setPhone(client.phone);
    setEmail(client.email);
    setStatus(client.status);
    setShowEditClientDialog(true);
  };
  
  const handleDelete = (client: any) => {
    setSelectedClient(client);
    setShowDeleteClientDialog(true);
  };
  
  const handleSubmitNew = async (e: React.FormEvent) => {
    e.preventDefault();
    addClientMutation.mutate({ name, phone, email, status });
  };
  
  const handleSubmitEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedClient) {
      updateClientMutation.mutate({ 
        id: selectedClient.id, 
        client: { name, phone, email, status } 
      });
    }
  };
  
  const confirmDelete = async () => {
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

  // Função para iniciar chamada para um cliente
  const handleCall = async (client: any) => {
    try {
      const { data } = await supabase.auth.getUser();
      const userId = data.user?.id;
      
      const result = await webhookService.triggerCallWebhook({
        action: 'start_call',
        client_id: client.id,
        client_name: client.name,
        client_phone: client.phone,
        user_id: userId,
        additional_data: {
          source: 'client_list',
          client_email: client.email,
          client_status: client.status,
          vapi_caller_id: "97141b30-c5bc-4234-babb-d38b79452e2a"
        }
      });
      
      if (result.success) {
        toast({
          title: "Ligação iniciada",
          description: `Iniciando ligação para ${client.name} (${client.phone})`,
        });
      } else {
        toast({
          title: "Erro ao iniciar ligação", 
          description: "Não foi possível iniciar a ligação. Tente novamente.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Erro ao iniciar ligação:', error);
      toast({
        title: "Erro", 
        description: "Ocorreu um erro ao tentar iniciar a ligação.",
        variant: "destructive"
      });
    }
  };

  // Renderização da tabela
  return (
    <div className="container mx-auto p-4 max-w-6xl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Clientes</h1>
        <Button onClick={() => setShowNewClientDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Adicionar Cliente
        </Button>
      </div>
      
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input 
          placeholder="Buscar clientes..." 
          className="pl-10" 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
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
          <p className="text-lg text-muted-foreground mb-4">Nenhum cliente encontrado</p>
          <Button onClick={() => setShowNewClientDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Adicionar seu primeiro cliente
          </Button>
        </div>
      ) : (
        <div className="rounded-md border overflow-hidden">
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
              {filteredClients.map((client) => (
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
                    <div className="flex justify-end gap-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleCall(client)}
                        title="Ligar para cliente"
                      >
                        <Phone className="h-4 w-4" />
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(client)}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDelete(client)}>
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
      
      <Dialog open={showNewClientDialog} onOpenChange={setShowNewClientDialog}>
        <DialogContent className="sm:max-w-md">
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
              />
            </div>
            <div>
              <Input 
                placeholder="Telefone" 
                value={phone} 
                onChange={(e) => setPhone(e.target.value)} 
                required 
              />
            </div>
            <div>
              <Input 
                placeholder="Email" 
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
              />
            </div>
            <div>
              <select 
                className="w-full border rounded-md py-2 px-3"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="Active">Ativo</option>
                <option value="Inactive">Inativo</option>
              </select>
            </div>
            <DialogFooter>
              <Button type="submit">
                <Plus className="h-4 w-4 mr-2" />
                Adicionar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      
      <Dialog open={showEditClientDialog} onOpenChange={setShowEditClientDialog}>
        <DialogContent className="sm:max-w-md">
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
              />
            </div>
            <div>
              <Input 
                placeholder="Telefone" 
                value={phone} 
                onChange={(e) => setPhone(e.target.value)} 
                required 
              />
            </div>
            <div>
              <Input 
                placeholder="Email" 
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
              />
            </div>
            <div>
              <select 
                className="w-full border rounded-md py-2 px-3"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="Active">Ativo</option>
                <option value="Inactive">Inativo</option>
              </select>
            </div>
            <DialogFooter>
              <Button type="submit">
                <Pencil className="h-4 w-4 mr-2" />
                Salvar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      
      <Dialog open={showDeleteClientDialog} onOpenChange={setShowDeleteClientDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Excluir Cliente</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p>Tem certeza de que deseja excluir este cliente?</p>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setShowDeleteClientDialog(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              <Trash2 className="h-4 w-4 mr-2" />
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
