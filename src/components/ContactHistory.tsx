import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Download, 
  ChevronDown, 
  Phone, 
  Clock, 
  Calendar, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  MessageSquare,
  Headphones,
  User,
  FileX
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
  DialogFooter 
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Card,
  CardContent
} from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { campaignService } from '@/services/campaignService';
import { useAuth } from '@/contexts/AuthContext';

const ContactHistory = () => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedContact, setSelectedContact] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [outcomeFilter, setOutcomeFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  
  // Fetch call history
  const { data: callHistory = [], isLoading } = useQuery({
    queryKey: ['callHistory'],
    queryFn: async () => {
      try {
        return await campaignService.getCallHistory();
      } catch (error) {
        console.error("Error fetching call history:", error);
        return [];
      }
    }
  });

  const handleExport = () => {
    if (callHistory.length === 0) {
      toast("Não há dados para exportar");
      return;
    }
    
    toast("Exportação iniciada. Seu histórico de contatos está sendo exportado.");
  };

  const viewContactDetails = (contact) => {
    setSelectedContact(contact);
    setDialogOpen(true);
  };

  const getStatusBadgeColor = (status) => {
    switch (status) {
      case 'Completed':
        return 'bg-secondary text-white';
      case 'No Answer':
        return 'bg-yellow-500/80 text-white';
      case 'Voicemail':
        return 'bg-blue-500/80 text-white';
      case 'Rejected':
        return 'bg-destructive/80 text-white';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getOutcomeBadgeColor = (outcome) => {
    switch (outcome) {
      case 'Interested':
        return 'bg-blue-500/80 text-white';
      case 'Conversion':
        return 'bg-secondary text-white';
      case 'Not Interested':
        return 'bg-destructive/80 text-white';
      case 'Follow-up Required':
        return 'bg-yellow-500/80 text-white';
      case 'Message Left':
        return 'bg-gray-500/80 text-white';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  // Filter history based on search term and filters
  const filteredHistory = callHistory.filter((item) => {
    // Only proceed if we have call history data
    if (!item) return false;
    
    // Search term filter
    const matchesSearch = (item.clientName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (item.phone || '').includes(searchTerm) ||
                         (item.campaign || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    // Status filter
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    
    // Outcome filter
    const matchesOutcome = outcomeFilter === 'all' || item.outcome === outcomeFilter;
    
    // Date filter
    let matchesDate = true;
    if (item.date) {
      const itemDate = new Date(item.date);
      const today = new Date();
      
      if (dateFilter === 'today') {
        const todayStr = today.toISOString().split('T')[0];
        matchesDate = item.date === todayStr;
      } else if (dateFilter === 'yesterday') {
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];
        matchesDate = item.date === yesterdayStr;
      } else if (dateFilter === 'lastWeek') {
        const lastWeek = new Date(today);
        lastWeek.setDate(today.getDate() - 7);
        matchesDate = itemDate >= lastWeek;
      }
    }
    
    return matchesSearch && matchesStatus && matchesOutcome && matchesDate;
  });

  // Render empty state when no data
  const renderEmptyState = () => (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <FileX className="h-16 w-16 text-muted-foreground mb-4" />
      <h3 className="text-xl font-semibold mb-2">Sem histórico de contatos</h3>
      <p className="text-muted-foreground mb-6 max-w-md">
        Você ainda não realizou nenhuma chamada. Comece criando uma campanha e contatando seus clientes.
      </p>
      <Button variant="outline" onClick={() => window.location.href = "/campaigns"}>
        Criar Campanha
      </Button>
    </div>
  );

  return (
    <div className="container mx-auto p-4 max-w-7xl">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <h1 className="text-3xl font-bold mb-4 md:mb-0">Histórico de Contatos</h1>
        
        <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar contatos..."
              className="pl-8 w-full"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleExport} 
            className="whitespace-nowrap"
            disabled={callHistory.length === 0}
          >
            <Download className="mr-2 h-4 w-4" />
            Exportar
          </Button>
        </div>
      </div>
      
      {/* Filters - Only show if we have data */}
      {callHistory.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-2 mb-6">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Status</SelectItem>
              <SelectItem value="Completed">Completado</SelectItem>
              <SelectItem value="No Answer">Sem Resposta</SelectItem>
              <SelectItem value="Voicemail">Correio de Voz</SelectItem>
              <SelectItem value="Rejected">Rejeitado</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={outcomeFilter} onValueChange={setOutcomeFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Resultado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Resultados</SelectItem>
              <SelectItem value="Interested">Interessado</SelectItem>
              <SelectItem value="Conversion">Conversão</SelectItem>
              <SelectItem value="Not Interested">Não Interessado</SelectItem>
              <SelectItem value="Follow-up Required">Acompanhamento Necessário</SelectItem>
              <SelectItem value="Message Left">Mensagem Deixada</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={dateFilter} onValueChange={setDateFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todo o Período</SelectItem>
              <SelectItem value="today">Hoje</SelectItem>
              <SelectItem value="yesterday">Ontem</SelectItem>
              <SelectItem value="lastWeek">Últimos 7 Dias</SelectItem>
            </SelectContent>
          </Select>
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => {
              setStatusFilter('all');
              setOutcomeFilter('all');
              setDateFilter('all');
              setSearchTerm('');
            }} 
            className="whitespace-nowrap"
            disabled={statusFilter === 'all' && outcomeFilter === 'all' && dateFilter === 'all' && searchTerm === ''}
          >
            Limpar Filtros
          </Button>
        </div>
      )}
      
      {/* History Table or Empty State */}
      {isLoading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-secondary"></div>
        </div>
      ) : callHistory.length === 0 ? (
        renderEmptyState()
      ) : (
        <div className="border rounded-lg overflow-hidden glass">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead className="hidden md:table-cell">Telefone</TableHead>
                <TableHead className="hidden lg:table-cell">Campanha</TableHead>
                <TableHead className="hidden md:table-cell">Data & Hora</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden sm:table-cell">Resultado</TableHead>
                <TableHead className="text-right">Detalhes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredHistory.length > 0 ? (
                filteredHistory.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className="font-medium truncate max-w-[150px]">{item.clientName}</div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">{item.phone}</TableCell>
                    <TableCell className="hidden lg:table-cell truncate max-w-[150px]">{item.campaign}</TableCell>
                    <TableCell className="hidden md:table-cell">
                      <div className="flex flex-col text-sm">
                        <span>{item.date}</span>
                        <span className="text-muted-foreground">{item.time}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs ${getStatusBadgeColor(item.status)}`}>
                        {item.status}
                      </span>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      {item.outcome !== 'N/A' ? (
                        <span className={`px-2 py-1 rounded-full text-xs ${getOutcomeBadgeColor(item.outcome)}`}>
                          {item.outcome}
                        </span>
                      ) : (
                        <span>—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => viewContactDetails(item)}
                      >
                        Ver
                        <ChevronDown className="ml-1 h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Nenhum histórico de contato encontrado. Tente ajustar seus filtros.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
      
      {/* Contact Details Dialog */}
      {selectedContact && (
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Detalhes do Contato</DialogTitle>
            </DialogHeader>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
              <Card>
                <CardContent className="p-4 space-y-4">
                  <div className="flex justify-between items-start">
                    <h3 className="font-semibold">Informações do Cliente</h3>
                    <User className="h-5 w-5 text-muted-foreground" />
                  </div>
                  
                  <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-1 py-1 border-b">
                      <div className="text-sm text-muted-foreground">Nome</div>
                      <div className="col-span-2 font-medium">{selectedContact.clientName}</div>
                    </div>
                    <div className="grid grid-cols-3 gap-1 py-1 border-b">
                      <div className="text-sm text-muted-foreground">Telefone</div>
                      <div className="col-span-2">{selectedContact.phone}</div>
                    </div>
                    <div className="grid grid-cols-3 gap-1 py-1 border-b">
                      <div className="text-sm text-muted-foreground">Campanha</div>
                      <div className="col-span-2">{selectedContact.campaign}</div>
                    </div>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row justify-end gap-2 pt-2">
                    <Button variant="outline" size="sm" className="flex items-center gap-1.5">
                      <Phone className="h-4 w-4" />
                      Ligar Agora
                    </Button>
                    <Button size="sm" className="flex items-center gap-1.5">
                      <MessageSquare className="h-4 w-4" />
                      Adicionar Nota
                    </Button>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4 space-y-4">
                  <div className="flex justify-between items-start">
                    <h3 className="font-semibold">Detalhes da Chamada</h3>
                    <Phone className="h-5 w-5 text-muted-foreground" />
                  </div>
                  
                  <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-1 py-1 border-b">
                      <div className="text-sm text-muted-foreground">Data</div>
                      <div className="col-span-2">{selectedContact.date}</div>
                    </div>
                    <div className="grid grid-cols-3 gap-1 py-1 border-b">
                      <div className="text-sm text-muted-foreground">Hora</div>
                      <div className="col-span-2">{selectedContact.time}</div>
                    </div>
                    <div className="grid grid-cols-3 gap-1 py-1 border-b">
                      <div className="text-sm text-muted-foreground">Duração</div>
                      <div className="col-span-2 flex items-center">
                        <Clock className="h-4 w-4 mr-1.5 text-muted-foreground" />
                        {selectedContact.duration}
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-1 py-1 border-b">
                      <div className="text-sm text-muted-foreground">Status</div>
                      <div className="col-span-2">
                        <span className={`px-2 py-1 rounded-full text-xs ${getStatusBadgeColor(selectedContact.status)}`}>
                          {selectedContact.status}
                        </span>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-1 py-1 border-b">
                      <div className="text-sm text-muted-foreground">Resultado</div>
                      <div className="col-span-2">
                        {selectedContact.outcome !== 'N/A' ? (
                          <span className={`px-2 py-1 rounded-full text-xs ${getOutcomeBadgeColor(selectedContact.outcome)}`}>
                            {selectedContact.outcome}
                          </span>
                        ) : (
                          <span>—</span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {selectedContact.status === 'Completed' && (
                    <div className="flex justify-end pt-2">
                      <Button variant="outline" size="sm" className="flex items-center gap-1.5">
                        <Headphones className="h-4 w-4" />
                        Ouvir Gravação
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
              
              <Card className="md:col-span-2">
                <CardContent className="p-4 space-y-2">
                  <h3 className="font-semibold">Notas</h3>
                  <p className="text-foreground/80">{selectedContact.notes || "Sem notas para esta chamada."}</p>
                </CardContent>
              </Card>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Fechar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default ContactHistory;
