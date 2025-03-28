
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MessageSquare, BarChart3, FileBarChart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import campaignService from '@/services/campaignService';
import { useAuth } from '@/contexts/AuthContext';

const Analytics = () => {
  const { user } = useAuth();

  // Fetch analytics data
  const { data: analyticsData, isLoading } = useQuery({
    queryKey: ['analyticsData'],
    queryFn: async () => {
      try {
        // This would fetch real analytics data
        return await campaignService.getAnalyticsData();
      } catch (error) {
        console.error("Error fetching analytics data:", error);
        return null;
      }
    }
  });

  // Check if user has any data to display
  const hasData = analyticsData && 
    (analyticsData.totalCalls > 0 || 
     (analyticsData.callsData && analyticsData.callsData.length > 0));

  // Empty state renderer
  const renderEmptyState = () => (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <FileBarChart className="h-16 w-16 text-muted-foreground mb-4" />
      <h3 className="text-xl font-semibold mb-2">Sem dados de análise ainda</h3>
      <p className="text-muted-foreground mb-6 max-w-md">
        Você ainda não tem dados suficientes para gerar análises. Comece criando uma campanha e realizando algumas chamadas.
      </p>
      <Button variant="outline" onClick={() => window.location.href = "/campaigns"}>
        Criar Campanha
      </Button>
    </div>
  );

  return (
    <div className="container mx-auto p-4 max-w-7xl">
      <h1 className="text-3xl font-bold mb-8">Analytics Dashboard</h1>

      <Tabs defaultValue="overview" className="w-full space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="campaigns">Desempenho de Campanhas</TabsTrigger>
          <TabsTrigger value="client-engagement">Engajamento de Clientes</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-4">
          {!hasData ? renderEmptyState() : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <Card className="card-hover">
                  <CardHeader>
                    <CardTitle className="text-lg font-semibold">Total de Chamadas</CardTitle>
                    <CardDescription>Número de chamadas realizadas este mês</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-4xl font-bold">{analyticsData.totalCalls || 0}</div>
                    <span className="text-sm text-muted-foreground">
                      {analyticsData.callsChangePercentage > 0 ? '+' : ''}{analyticsData.callsChangePercentage || 0}% do mês passado
                    </span>
                  </CardContent>
                </Card>

                <Card className="card-hover">
                  <CardHeader>
                    <CardTitle className="text-lg font-semibold">Duração Média de Chamada</CardTitle>
                    <CardDescription>Tempo médio de duração das chamadas</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-4xl font-bold">{analyticsData.avgCallDuration || '0:00'}</div>
                    <span className="text-sm text-muted-foreground">
                      {analyticsData.durationChangePercentage > 0 ? '+' : ''}{analyticsData.durationChangePercentage || 0}% do mês passado
                    </span>
                  </CardContent>
                </Card>

                <Card className="card-hover">
                  <CardHeader>
                    <CardTitle className="text-lg font-semibold">Taxa de Conversão</CardTitle>
                    <CardDescription>Porcentagem de chamadas que resultam em conversão</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-4xl font-bold">{analyticsData.conversionRate || '0'}%</div>
                    <span className="text-sm text-muted-foreground">
                      {analyticsData.conversionChangePercentage > 0 ? '+' : ''}{analyticsData.conversionChangePercentage || 0}% do mês passado
                    </span>
                  </CardContent>
                </Card>
              </div>

              <Card className="card-hover">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold">Desempenho Mensal de Chamadas</CardTitle>
                  <CardDescription>Visão detalhada das chamadas realizadas a cada mês</CardDescription>
                </CardHeader>
                <CardContent>
                  {analyticsData.callsData && analyticsData.callsData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={400}>
                      <BarChart data={analyticsData.callsData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="calls" fill="#8884d8" />
                        <Bar dataKey="cost" fill="#82ca9d" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[400px] flex items-center justify-center">
                      <p className="text-muted-foreground">Dados de gráfico insuficientes</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="campaigns" className="space-y-4">
          {!hasData ? renderEmptyState() : (
            <Card className="card-hover">
              <CardHeader>
                <CardTitle className="text-lg font-semibold">Taxas de Sucesso de Campanhas</CardTitle>
                <CardDescription>Taxas de conversão para cada campanha ativa</CardDescription>
              </CardHeader>
              <CardContent>
                {analyticsData.campaignData && analyticsData.campaignData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={analyticsData.campaignData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={120}
                        fill="#8884d8"
                        dataKey="value"
                        label={({cx, cy, midAngle, innerRadius, outerRadius, percent}) => {
                          const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                          const x = cx + radius * Math.cos(-midAngle * Math.PI / 180);
                          const y = cy + radius * Math.sin(-midAngle * Math.PI / 180);
                          return (
                            <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central">
                              {`${(percent * 100).toFixed(0)}%`}
                            </text>
                          );
                        }}
                      >
                        {analyticsData.campaignData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'][index % 6]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center">
                    <p className="text-muted-foreground">Dados de campanhas insuficientes</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="client-engagement" className="space-y-4">
          {!hasData ? renderEmptyState() : (
            <Card className="card-hover">
              <CardHeader>
                <CardTitle className="text-lg font-semibold">Análise de Interação com Clientes</CardTitle>
                <CardDescription>Insights sobre como os clientes estão interagindo com as chamadas</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold flex items-center justify-center h-[300px]">
                  <div className="text-center">
                    <MessageSquare className="h-6 w-6 mr-2 inline-block" />
                    <p>Analisando padrões de engajamento para melhorar estratégias de chamada.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Analytics;
