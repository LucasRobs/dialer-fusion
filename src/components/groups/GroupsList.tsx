
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Table, 
  TableHeader, 
  TableRow, 
  TableHead, 
  TableBody, 
  TableCell 
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Pencil, 
  Trash2, 
  Users,
  Eye
} from 'lucide-react';
import { ClientGroup, clientGroupService } from '@/services/clientGroupService';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface GroupsListProps {
  onShowClients: (group: ClientGroup) => void;
  onEdit: (group: ClientGroup) => void;
  onDelete: (group: ClientGroup) => void;
}

const GroupsList = ({ onShowClients, onEdit, onDelete }: GroupsListProps) => {
  const { user } = useAuth();
  
  const { data: clientGroups = [], isLoading } = useQuery({
    queryKey: ['clientGroups'],
    queryFn: async () => {
      try {
        // First, get the groups
        const groups = await clientGroupService.getClientGroups();
          
        // Then get the count of clients in each group
        const groupsWithCounts = await Promise.all(
          groups.map(async (group) => {
            const { count } = await supabase
              .from('client_group_members')
              .select('*', { count: 'exact', head: true })
              .eq('group_id', group.id);
              
            return { 
              ...group, 
              client_count: count || 0 
            };
          })
        );
          
        return groupsWithCounts;
      } catch (error) {
        console.error('Error fetching client groups:', error);
        return [];
      }
    },
    enabled: !!user?.id
  });
  
  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <div className="animate-spin h-8 w-8 border-b-2 border-primary rounded-full"></div>
      </div>
    );
  }
  
  if (clientGroups.length === 0) {
    return (
      <div className="text-center p-8 border rounded-lg">
        <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <p className="text-lg text-muted-foreground mb-4">Nenhum grupo criado</p>
      </div>
    );
  }
  
  return (
    <div className="rounded-md border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Descrição</TableHead>
            <TableHead>Clientes</TableHead>
            <TableHead>Criado em</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {clientGroups.map((group) => (
            <TableRow 
              key={group.id}
              className="cursor-pointer hover:bg-accent/50"
              onClick={(e) => onShowClients(group)}
            >
              <TableCell className="font-medium">{group.name}</TableCell>
              <TableCell>{group.description || '-'}</TableCell>
              <TableCell>
                <Badge>{group.client_count}</Badge>
              </TableCell>
              <TableCell>{new Date(group.created_at).toLocaleDateString()}</TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      onShowClients(group);
                    }}
                    title="Ver clientes"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(group);
                    }}
                    title="Editar grupo"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(group);
                    }}
                    className="text-destructive hover:text-destructive"
                    title="Excluir grupo"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default GroupsList;
