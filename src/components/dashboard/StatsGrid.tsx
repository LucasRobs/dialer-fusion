import React from 'react';
import { Link } from 'react-router-dom';
import { Users, Phone, BarChart3, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

interface StatsData {
  totalClients: number;
  activeClients: number;
  recentCalls: number;
  avgCallDuration: string;
  callsToday: number;
  completionRate: string;
}

interface StatsGridProps {
  stats: StatsData;
  isLoading?: boolean;
}

const StatsGrid: React.FC<StatsGridProps> = ({ stats, isLoading = false }) => {
  // Use safe values in case stats are undefined or contain null/undefined values
  const safeStats = {
    totalClients: stats?.totalClients || 0,
    activeClients: stats?.activeClients || 0,
    recentCalls: stats?.recentCalls || 0,
    avgCallDuration: stats?.avgCallDuration || '0:00',
    callsToday: stats?.callsToday || 0,
    completionRate: stats?.completionRate || '0%',
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      {/* Client Base Card */}
      <Card className="card-hover">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-medium flex items-center">
            <Users className="h-5 w-5 mr-2 text-secondary" />
            Base de Clientes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-24" />
              <Skeleton className="h-4 w-32" />
              <div className="flex justify-end">
                <Skeleton className="h-7 w-16" />
              </div>
              <Skeleton className="h-10 w-full mt-4" />
            </div>
          ) : (
            <>
              <div className="flex justify-between items-end">
                <div>
                  <div className="text-3xl font-bold">{safeStats.totalClients}</div>
                  <p className="text-sm text-foreground/70">Total de Clientes</p>
                </div>
                <div className="text-right">
                  <div className="text-xl font-semibold text-secondary">{safeStats.activeClients}</div>
                  <p className="text-sm text-foreground/70">Ativos</p>
                </div>
              </div>
              <Link to="/clients">
                <Button variant="ghost" className="w-full mt-4 text-sm">
                  Ver Todos os Clientes
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </>
          )}
        </CardContent>
      </Card>

      {/* Recent Activity Card */}
      <Card className="card-hover">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-medium flex items-center">
            <Phone className="h-5 w-5 mr-2 text-secondary" />
            Atividade Recente
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-24" />
              <Skeleton className="h-4 w-32" />
              <div className="flex justify-end">
                <Skeleton className="h-7 w-16" />
              </div>
              <Skeleton className="h-10 w-full mt-4" />
            </div>
          ) : (
            <>
              <div className="flex justify-between items-end">
                <div>
                  <div className="text-3xl font-bold">{safeStats.recentCalls}</div>
                  <p className="text-sm text-foreground/70">Ligações Realizadas</p>
                </div>
                <div className="text-right">
                  <div className="text-xl font-semibold">{safeStats.avgCallDuration}</div>
                  <p className="text-sm text-foreground/70">Duração Média</p>
                </div>
              </div>
              <Link to="/history">
                <Button variant="ghost" className="w-full mt-4 text-sm">
                  Ver Histórico de Ligações
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </>
          )}
        </CardContent>
      </Card>

      {/* Performance Card */}
      <Card className="card-hover">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-medium flex items-center">
            <BarChart3 className="h-5 w-5 mr-2 text-secondary" />
            Desempenho
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-24" />
              <Skeleton className="h-4 w-32" />
              <div className="flex justify-end">
                <Skeleton className="h-7 w-16" />
              </div>
              <Skeleton className="h-10 w-full mt-4" />
            </div>
          ) : (
            <>
              <div className="flex justify-between items-end">
                <div>
                  <div className="text-3xl font-bold">{safeStats.callsToday}</div>
                  <p className="text-sm text-foreground/70">Ligações Hoje</p>
                </div>
                <div className="text-right">
                  <div className="text-xl font-semibold text-secondary">{safeStats.completionRate}</div>
                  <p className="text-sm text-foreground/70">Taxa de Conclusão</p>
                </div>
              </div>
              <Link to="/analytics">
                <Button variant="ghost" className="w-full mt-4 text-sm">
                  Ver Análises
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default StatsGrid;
