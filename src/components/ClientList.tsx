
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
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
  RefreshCw,
  Loader2
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
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('Active');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
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
    queryKey: ['clients', selectedGroupId],
    queryFn: () => {
      if (selectedGroupId) {
        return clientService.getClientsByGroupId(selectedGroupId);
      }
      return clientService.getClients();
    },
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
      setIsSubmitting(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao adicionar cliente",
        description: error.message || "Ocorreu um erro ao adicionar o cliente.",
        variant: "destructive",
      });
      setIsSubmitting(false);
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
      setIsSubmitting(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar cliente",
        description: error.message || "Ocorreu um erro ao atualizar o cliente.",
        variant: "destructive",
      });
      setIsSubmitting(false);
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
      setIsSubmitting(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao excluir cliente",
        description: error.message || "Ocorreu um erro ao excluir o cliente.",
        variant: "destructive",
      });
      setIsSubmitting(false);
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
    
    if (isSubmitting) return;
    
    setIsSubmitting(true);
    addClientMutation.mutate({ name, phone, email, status });
  };
  
  const handleSubmitEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (isSubmitting || !selectedClient) return;
    
    setIsSubmitting(true);
    updateClientMutation.mutate({ 
      id: selectedClient.id, 
      client: { name, phone, email, status } 
    });
  };
  
  const confirmDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (isSubmitting || !selectedClient) return;
    
    setIsSubmitting(true);
    deleteClientMutation.mutate(selectedClient.id);
  };
  
  const clearForm = () => {
    setName('');
    setPhone('');
    setEmail('');
    setStatus('Active');
    setSelectedClient(null);
    setIsSubmitting(false);
  };

  const handleCall = async (e: React.MouseEvent, client: any) => {
    e.stopPropagation();
    e.preventDefault();
    
    if (isSubmitting) return;
    
    try {
      setIsSubmitting(true);
      const { data } = await supabase.auth.getUser();
      const userId = data.user?.id;
      
      const result = await webhookService.triggerCallWebhook({
        action: 'start_call',
        campaign_id: 0,
        client_id: client.id,
        client_name: client.name,
        client_phone: client.phone,
        user_id: userId || '',
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
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImportClients = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowImportDialog(true);
  };

  const handleGroupFilterChange = (value: string) => {
    setSelectedGroupId(value);
  };

  return (
    <div className="container mx-auto p-4 max-w-6xl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Clientes</h1>
        <div className="flex gap-2">
          <Button onClick={handleImportClients} disabled={isSubmitting}>
            <FileUp className="h-4 w-4 mr-2" />
            Importar Clientes
          </Button>
          <Button onClick={handleNew} disabled={isSubmitting}>
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
            disabled={isSubmitting}
          />
        </div>
        
        <div className="w-full md:w-64">
          <Select
            value={selectedGroupId}
            onValueChange={handleGroupFilterChange}
            disabled={isSubmitting || isLoadingGroups}
          >
            <SelectTrigger className="w-full">
              <div className="flex items-center">
                <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Filtrar por grupo" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todos os clientes</SelectItem>
              {clientGroups.map((group) => (
                <SelectItem key={group.id} value={group.id}>
                  {group.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <Button 
          variant="outline" 
          size="icon"
          onClick={() => refetch()}
          disabled={isSubmitting}
          title="Atualizar lista"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
        </Button>
      </div>
      
      {isLoading ? (
        <div className="flex justify-center p-8">
          <div className="animate-spin h-8 w-8 border-b-2 border-primary rounded-full"></div>
        </div>
      ) : error ? (
        <div className="p-8 text-center">
          <p className="text-red-500">Erro ao carregar clientes: {error instanceof Error ? error.message : 'Erro desconhecido'}</p>
          <Button onClick={() => refetch()} variant="outline" className="mt-4" disabled={isSubmitting}>
            Tentar novamente
          </Button>
        </div>
      ) : clients.length === 0 ? (
        <div className="text-center p-8 border rounded-lg">
          <p className="text-lg text-muted-foreground mb-4">
            {selectedGroupId 
              ? "Este grupo não possui clientes" 
              : "Nenhum cliente encontrado"
            }
          </p>
          {!selectedGroupId && (
            <Button onClick={handleNew} disabled={isSubmitting}>
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
                  <TableCell>
                    <Badge variant={client.status === 'Active' ? 'default' : 'secondary'}>
                      {client.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <ClientGroupRelation client={client}/>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={(e) => handleCall(e, client)}
                        title="Ligar para cliente"
                        disabled={isSubmitting}
                      >
                        <Phone className="h-4 w-4" />
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={(e) => e.stopPropagation()}
                            disabled={isSubmitting}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                          <DropdownMenuItem onClick={(e) => handleEdit(e, client)} disabled={isSubmitting}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={(e) => handleDelete(e, client)} disabled={isSubmitting}>
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
            <DialogDescription>
              Preencha os dados abaixo para adicionar um novo cliente.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmitNew} className="space-y-4">
            <div>
              <Input 
                placeholder="Nome" 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                required 
                onClick={(e) => e.stopPropagation()}
                disabled={isSubmitting}
              />
            </div>
            <div>
              <Input 
                placeholder="Telefone" 
                value={phone} 
                onChange={(e) => setPhone(e.target.value)} 
                required 
                onClick={(e) => e.stopPropagation()}
                disabled={isSubmitting}
              />
            </div>
            <div>
              <Input 
                placeholder="Email" 
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                onClick={(e) => e.stopPropagation()}
                disabled={isSubmitting}
              />
            </div>
            <div>
              <Select 
                value={status} 
                onValueChange={setStatus}
                disabled={isSubmitting}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Status do cliente" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active">Ativo</SelectItem>
                  <SelectItem value="Inactive">Inativo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button 
                type="submit" 
                onClick={(e) => e.stopPropagation()}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Adicionando...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar
                  </>
                )}
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
            <DialogDescription>
              Modifique os dados do cliente abaixo.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmitEdit} className="space-y-4">
            <div>
              <Input 
                placeholder="Nome" 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                required 
                onClick={(e) => e.stopPropagation()}
                disabled={isSubmitting}
              />
            </div>
            <div>
              <Input 
                placeholder="Telefone" 
                value={phone} 
                onChange={(e) => setPhone(e.target.value)} 
                required 
                onClick={(e) => e.stopPropagation()}
                disabled={isSubmitting}
              />
            </div>
            <div>
              <Input 
                placeholder="Email" 
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                onClick={(e) => e.stopPropagation()}
                disabled={isSubmitting}
              />
            </div>
            <div>
              <Select 
                value={status} 
                onValueChange={setStatus}
                disabled={isSubmitting}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Status do cliente" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active">Ativo</SelectItem>
                  <SelectItem value="Inactive">Inativo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button 
                type="submit" 
                onClick={(e) => e.stopPropagation()}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Pencil className="h-4 w-4 mr-2" />
                    Salvar
                  </>
                )}
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
            <DialogDescription>
              Tem certeza de que deseja excluir este cliente? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p>Nome: <strong>{selectedClient?.name}</strong></p>
            <p>Telefone: <strong>{selectedClient?.phone}</strong></p>
          </div>
          <DialogFooter>
            <Button 
              variant="secondary" 
              onClick={(e) => {
                e.stopPropagation();
                setShowDeleteClientDialog(false);
              }}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button 
              variant="destructive" 
              onClick={confirmDelete}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Excluindo...
                </>
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

      <ImportClientsSheet 
        isOpen={showImportDialog}
        onClose={() => setShowImportDialog(false)}
      />
    </div>
  );
}
