
import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Table, 
  TableHeader, 
  TableRow, 
  TableHead, 
  TableBody, 
  TableCell 
} from '@/components/ui/table';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardContent 
} from '@/components/ui/card';
import { 
  Plus, 
  Pencil, 
  Trash2, 
  Users 
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export interface ClientGroup {
  id: string;
  name: string;
  description?: string;
  client_count: number;
  created_at: string;
  user_id: string;
}

const ClientGroupManager = () => {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<ClientGroup | null>(null);
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const { data: clientGroups = [], isLoading } = useQuery({
    queryKey: ['clientGroups'],
    queryFn: async () => {
      try {
        // First, get the groups
        const { data: groups, error } = await supabase
          .from('client_groups')
          .select('*')
          .eq('user_id', user?.id);
          
        if (error) throw error;
          
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
  
  const createGroupMutation = useMutation({
    mutationFn: async (groupData: { name: string; description: string }) => {
      const { data, error } = await supabase
        .from('client_groups')
        .insert([
          { 
            name: groupData.name,
            description: groupData.description,
            user_id: user?.id
          }
        ])
        .select();
        
      if (error) throw error;
      return data[0];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientGroups'] });
      toast.success('Grupo criado com sucesso');
      setShowCreateDialog(false);
      clearForm();
    },
    onError: (error: Error) => {
      toast.error(`Erro ao criar grupo: ${error.message}`);
    }
  });
  
  const updateGroupMutation = useMutation({
    mutationFn: async (groupData: { id: string; name: string; description: string }) => {
      const { data, error } = await supabase
        .from('client_groups')
        .update({ 
          name: groupData.name,
          description: groupData.description
        })
        .eq('id', groupData.id)
        .select();
        
      if (error) throw error;
      return data[0];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientGroups'] });
      toast.success('Grupo atualizado com sucesso');
      setShowEditDialog(false);
      clearForm();
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar grupo: ${error.message}`);
    }
  });
  
  const deleteGroupMutation = useMutation({
    mutationFn: async (id: string) => {
      // First delete all client-group relationships
      const { error: relationshipError } = await supabase
        .from('client_group_members')
        .delete()
        .eq('group_id', id);
        
      if (relationshipError) throw relationshipError;
      
      // Then delete the group
      const { error } = await supabase
        .from('client_groups')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientGroups'] });
      toast.success('Grupo excluído com sucesso');
      setShowDeleteDialog(false);
    },
    onError: (error: Error) => {
      toast.error(`Erro ao excluir grupo: ${error.message}`);
    }
  });
  
  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createGroupMutation.mutate({ 
      name: groupName, 
      description: groupDescription 
    });
  };
  
  const handleEdit = (group: ClientGroup) => {
    setSelectedGroup(group);
    setGroupName(group.name);
    setGroupDescription(group.description || '');
    setShowEditDialog(true);
  };
  
  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedGroup) {
      updateGroupMutation.mutate({
        id: selectedGroup.id,
        name: groupName,
        description: groupDescription
      });
    }
  };
  
  const handleDelete = (group: ClientGroup) => {
    setSelectedGroup(group);
    setShowDeleteDialog(true);
  };
  
  const confirmDelete = () => {
    if (selectedGroup) {
      deleteGroupMutation.mutate(selectedGroup.id);
    }
  };
  
  const clearForm = () => {
    setGroupName('');
    setGroupDescription('');
    setSelectedGroup(null);
  };
  
  return (
    <div className="mt-8 max-w-6xl mx-auto">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Grupos de Clientes</CardTitle>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Grupo
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center p-8">
              <div className="animate-spin h-8 w-8 border-b-2 border-primary rounded-full"></div>
            </div>
          ) : clientGroups.length === 0 ? (
            <div className="text-center p-8 border rounded-lg">
              <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-lg text-muted-foreground mb-4">Nenhum grupo criado</p>
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Criar meu primeiro grupo
              </Button>
            </div>
          ) : (
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
                    <TableRow key={group.id}>
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
                            onClick={() => handleEdit(group)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleDelete(group)}
                            className="text-destructive hover:text-destructive"
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
          )}
        </CardContent>
      </Card>
      
      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Criar Novo Grupo</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <Input 
                placeholder="Nome do grupo" 
                value={groupName} 
                onChange={(e) => setGroupName(e.target.value)} 
                required 
              />
            </div>
            <div>
              <Input 
                placeholder="Descrição (opcional)" 
                value={groupDescription} 
                onChange={(e) => setGroupDescription(e.target.value)} 
              />
            </div>
            <DialogFooter>
              <Button type="submit">
                <Plus className="h-4 w-4 mr-2" />
                Criar Grupo
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      
      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Grupo</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-4">
            <div>
              <Input 
                placeholder="Nome do grupo" 
                value={groupName} 
                onChange={(e) => setGroupName(e.target.value)} 
                required 
              />
            </div>
            <div>
              <Input 
                placeholder="Descrição (opcional)" 
                value={groupDescription} 
                onChange={(e) => setGroupDescription(e.target.value)} 
              />
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
      
      {/* Delete Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Excluir Grupo</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p>Tem certeza de que deseja excluir este grupo?</p>
            {selectedGroup && selectedGroup.client_count > 0 && (
              <p className="text-amber-500 mt-2">
                Atenção: Este grupo contém {selectedGroup.client_count} clientes. 
                A exclusão do grupo não excluirá os clientes.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setShowDeleteDialog(false)}>
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
};

export default ClientGroupManager;
