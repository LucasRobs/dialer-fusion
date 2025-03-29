
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import CampaignControls from '@/components/CampaignControls';
import { BarChart3, Search, Calendar, Filter, AlertCircle } from 'lucide-react';
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
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { campaignService } from '@/services/campaignService';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';

const CampaignsPage = () => {
  const [searchTerm, setSearchTerm] = useState('');
  
  // Fetch campaigns
  const { data: campaigns, isLoading, error, refetch } = useQuery({
    queryKey: ['campaigns'],
    queryFn: async () => {
      const data = await campaignService.getCampaigns();
      return data;
    }
  });
  
  // Filter campaigns based on search term
  const filteredCampaigns = campaigns?.filter(campaign => 
    campaign.name?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];
  
  // Get status badge color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-500';
      case 'pending':
        return 'bg-yellow-500';
      case 'completed':
        return 'bg-blue-500';
      case 'stopped':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };
  
  // Format date
  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    try {
      return format(new Date(dateString), 'dd/MM/yyyy HH:mm');
    } catch (error) {
      return 'Data inválida';
    }
  };
  
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 pt-28 pb-16">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Campanhas</h1>
          <Link to="/analytics">
            <Button 
              className="bg-secondary hover:bg-secondary/90"
              size="lg"
            >
              <BarChart3 className="mr-2 h-5 w-5" />
              Analytics
            </Button>
          </Link>
        </div>
        
        {/* Search and filters */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Buscar campanhas..." 
              className="pl-10 w-full"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <CampaignControls />
          </div>
        </div>
        
        {/* Campaigns table */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Todas as Campanhas</CardTitle>
            <CardDescription>
              Gerencie suas campanhas de chamadas ativas e passadas
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center p-6">
                <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center p-6 text-center">
                <AlertCircle className="h-10 w-10 text-destructive mb-2" />
                <h3 className="font-medium text-lg">Erro ao carregar campanhas</h3>
                <p className="text-muted-foreground mb-4">Ocorreu um erro ao buscar os dados.</p>
                <Button onClick={() => refetch()}>Tentar novamente</Button>
              </div>
            ) : filteredCampaigns.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-10 text-center">
                <Calendar className="h-10 w-10 text-muted-foreground mb-2" />
                <h3 className="font-medium text-lg">Nenhuma campanha encontrada</h3>
                <p className="text-muted-foreground mb-4">
                  {searchTerm 
                    ? "Nenhuma campanha corresponde à sua busca." 
                    : "Você ainda não criou nenhuma campanha."}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Criada em</TableHead>
                      <TableHead>Início</TableHead>
                      <TableHead>Chamadas</TableHead>
                      <TableHead>Progresso</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCampaigns.map((campaign) => (
                      <TableRow key={campaign.id}>
                        <TableCell className="font-medium">{campaign.name}</TableCell>
                        <TableCell>
                          <Badge 
                            variant="outline" 
                            className={`capitalize ${getStatusColor(campaign.status)} text-white`}
                          >
                            {campaign.status || 'Pendente'}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatDate(campaign.created_at)}</TableCell>
                        <TableCell>{campaign.start_date ? formatDate(campaign.start_date) : 'Não iniciada'}</TableCell>
                        <TableCell>
                          {campaign.answered_calls || 0} / {campaign.total_calls || 0}
                        </TableCell>
                        <TableCell>
                          <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-secondary"
                              style={{ 
                                width: `${campaign.total_calls ? (campaign.answered_calls / campaign.total_calls) * 100 : 0}%` 
                              }}
                            ></div>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CampaignsPage;
