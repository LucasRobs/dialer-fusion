import React from 'react';
import { Link } from 'react-router-dom';
import { Users, ArrowRight, Group } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

interface StatsData {
  totalClients: number;
  activeClients: number;
  totalGroups: number;
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
    totalGroups: stats?.totalGroups || 0,
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
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

      {/* Client Groups Card */}
      <Card className="card-hover">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-medium flex items-center">
            <Group className="h-5 w-5 mr-2 text-secondary" />
            Grupos de Clientes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-24" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-10 w-full mt-4" />
            </div>
          ) : (
            <>
              <div>
                <div className="text-3xl font-bold">{safeStats.totalGroups}</div>
                <p className="text-sm text-foreground/70">Total de Grupos</p>
              </div>
              <Link to="/clients">
                <Button variant="ghost" className="w-full mt-4 text-sm">
                  Gerenciar Grupos
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
