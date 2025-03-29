import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { CalendarIcon, Plus, Trash2, Users } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { campaignService } from '@/services/campaignService';
import { clientService, Client } from '@/services/clientService';
import { useAuth } from '@/contexts/AuthContext';
import { clientGroupService } from '@/services/clientGroupService';

export default function CampaignControls() {
  const [showNewCampaignDialog, setShowNewCampaignDialog] = useState(false);
  const [showAddClientsDialog, setShowAddClientsDialog] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<any>(null);
  const [campaignName, setCampaignName] = useState('');
  const [campaignDate, setCampaignDate] = useState<Date | undefined>(new Date());
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClientIds, setSelectedClientIds] = useState<number[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  const { data: campaigns = [], isLoading: isLoadingCampaigns } = useQuery({
    queryKey: ['campaigns'],
    queryFn: campaignService.getCampaigns,
  });
  
  const { data: clients = [], isLoading: isLoadingClients } = useQuery({
    queryKey: ['clients', selectedGroupId],
    queryFn: () => {
      if (selectedGroupId) {
        return clientService.getClientsByGroupId(selectedGroupId);
      }
      return clientService.getClients();
    },
  });

  const { data: clientGroups = [], isLoading: isLoadingGroups } = useQuery({
    queryKey: ['clientGroups'],
    queryFn: () => clientGroupService.getClientGroups(),
    enabled: !!user?.id,
  });
  
  const createCampaignMutation = useMutation({
    mutationFn: (campaignData: { name: string; startDate: Date }) => 
      campaignService.createCampaign(campaignData.name, campaignData.startDate),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      toast({
        title: "Campanha criada",
        description: "Campanha criada com sucesso.",
      });
      setShowNewCampaignDialog(false);
      setCampaignName('');
      setCampaignDate(new Date());
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao criar campanha",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const addClientsToCampaignMutation = useMutation({
    mutationFn: async (data: { campaignId: number; clientIds: number[] }) => {
      const promises = data.clientIds.map(clientId =>
        campaignService.addClientToCampaign(data.campaignId, clientId)
      );
      
      return Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['campaignClients'] });
      toast({
        title: "Clientes adicionados",
        description: "Clientes adicionados à campanha com sucesso.",
      });
      setShowAddClientsDialog(false);
      setSelectedClientIds([]);
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao adicionar clientes",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const handleCreateCampaign = (e: React.FormEvent) => {
    e.preventDefault();
    if (campaignName && campaignDate) {
      createCampaignMutation.mutate({ 
        name: campaignName, 
        startDate: campaignDate 
      });
    }
  };
  
  const handleAddClients = (campaign: any) => {
    setSelectedCampaign(campaign);
    setShowAddClientsDialog(true);
  };
  
  const handleSubmitAddClients = () => {
    if (selectedCampaign && selectedClientIds.length > 0) {
      addClientsToCampaignMutation.mutate({
        campaignId: selectedCampaign.id,
        clientIds: selectedClientIds
      });
    }
  };
  
  const handleCheckClient = (clientId: number, checked: boolean) => {
    if (checked) {
      setSelectedClientIds(prev => [...prev, clientId]);
    } else {
      setSelectedClientIds(prev => prev.filter(id => id !== clientId));
    }
  };
  
  const handleSelectAllClients = (checked: boolean) => {
    if (checked) {
      const filteredClientIds = filteredClients.map(client => client.id);
      setSelectedClientIds(filteredClientIds);
    } else {
      setSelectedClientIds([]);
    }
  };
  
  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.phone.includes(searchTerm) ||
    client.email.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const handleGroupFilterChange = (value: string) => {
    setSelectedGroupId(value);
    setSelectedClientIds([]);
  };
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Campanhas</h2>
        <Button onClick={() => setShowNewCampaignDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Campanha
        </Button>
      </div>
      
      {isLoadingCampaigns ? (
        <div className="flex justify-center p-8">
          <div className="animate-spin h-8 w-8 border-b-2 border-primary rounded-full"></div>
        </div>
      ) : campaigns.length === 0 ? (
        <Card>
          <CardContent className="text-center p-8">
            <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-lg text-muted-foreground mb-4">Nenhuma campanha criada</p>
            <Button onClick={() => setShowNewCampaignDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Criar minha primeira campanha
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {campaigns.map((campaign) => (
            <Card key={campaign.id}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xl">{campaign.name}</CardTitle>
                <Badge
                  variant={campaign.status === 'active' ? 'default' : 'secondary'}
                >
                  {campaign.status === 'active' ? 'Ativa' : 'Inativa'}
                </Badge>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Início</p>
                    <p>{campaign.start_date ? format(new Date(campaign.start_date), 'dd/MM/yyyy') : '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Chamadas</p>
                    <p>{campaign.total_calls || 0} total / {campaign.answered_calls || 0} atendidas</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Duração Média</p>
                    <p>{campaign.average_duration ? `${Math.round(campaign.average_duration / 60)} minutos` : '-'}</p>
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  className="mt-2"
                  onClick={() => handleAddClients(campaign)}
                >
                  <Users className="h-4 w-4 mr-2" />
                  Adicionar Clientes
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      
      {/* Nova Campanha Dialog */}
      <Dialog open={showNewCampaignDialog} onOpenChange={setShowNewCampaignDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nova Campanha</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateCampaign} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="campaign-name">Nome da Campanha</Label>
              <Input 
                id="campaign-name" 
                value={campaignName} 
                onChange={(e) => setCampaignName(e.target.value)} 
                placeholder="Ex: Campanha de Verão 2025"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Data de Início</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {campaignDate ? format(campaignDate, 'dd/MM/yyyy') : <span>Selecione uma data</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={campaignDate}
                    onSelect={setCampaignDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <DialogFooter>
              <Button type="submit">Criar Campanha</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      
      {/* Adicionar Clientes Dialog */}
      <Dialog 
        open={showAddClientsDialog} 
        onOpenChange={(open) => {
          if (!open) {
            setSelectedClientIds([]);
          }
          setShowAddClientsDialog(open);
        }}
      >
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Adicionar Clientes à Campanha</DialogTitle>
          </DialogHeader>
          <div className="flex items-center gap-4 mb-4">
            <Input 
              placeholder="Buscar clientes..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
            
            <Select
              value={selectedGroupId}
              onValueChange={handleGroupFilterChange}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filtrar por grupo" />
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
          <div className="overflow-y-auto flex-1 border rounded-md">
            {isLoadingClients ? (
              <div className="flex justify-center p-8">
                <div className="animate-spin h-8 w-8 border-b-2 border-primary rounded-full"></div>
              </div>
            ) : filteredClients.length === 0 ? (
              <div className="text-center p-8">
                <p className="text-muted-foreground">Nenhum cliente encontrado</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <input 
                        type="checkbox" 
                        className="w-4 h-4" 
                        checked={selectedClientIds.length === filteredClients.length && filteredClients.length > 0}
                        onChange={(e) => handleSelectAllClients(e.target.checked)}
                      />
                    </TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredClients.map((client) => (
                    <TableRow key={client.id}>
                      <TableCell>
                        <input 
                          type="checkbox" 
                          className="w-4 h-4" 
                          checked={selectedClientIds.includes(client.id)}
                          onChange={(e) => handleCheckClient(client.id, e.target.checked)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{client.name}</TableCell>
                      <TableCell>{client.phone}</TableCell>
                      <TableCell>{client.email || '-'}</TableCell>
                      <TableCell>
                        <Badge variant={client.status === 'Active' ? 'default' : 'secondary'}>
                          {client.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
          <DialogFooter className="pt-4">
            <div className="mr-auto">
              {selectedClientIds.length} clientes selecionados
            </div>
            <Button 
              onClick={handleSubmitAddClients}
              disabled={selectedClientIds.length === 0}
            >
              Adicionar à Campanha
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
