
import React, { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Users, PlusCircle, Check, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { ClientGroup, clientGroupService } from '../services/clientGroupService';

interface ClientGroupRelationProps {
  client: any;
}

// Define a type for the membership to ensure proper typing
interface GroupMembership {
  groupId: string;
  groupName: string;
}

const ClientGroupRelation = ({ client }: ClientGroupRelationProps) => {
  const [showAddToGroupDialog, setShowAddToGroupDialog] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const { data: clientGroups = [], isLoading: isLoadingGroups } = useQuery({
    queryKey: ['clientGroups'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('client_groups')
          .select('*')
          .eq('user_id', user?.id);
          
        if (error) throw error;
        return data;
      } catch (error) {
        console.error('Error fetching client groups:', error);
        return [];
      }
    },
    enabled: !!user?.id
  });
  
  const { data: clientGroupMemberships = [], isLoading: isLoadingMemberships } = useQuery({
    queryKey: ['clientGroupMemberships', client.id],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('client_group_members')
          .select(`
            group_id,
            client_groups (
              id,
              name
            )
          `)
          .eq('client_id', client.id);
          
        if (error) throw error;
        
        // Properly map and type the response
        return data.map((item: any) => ({
          groupId: item.group_id,
          groupName: item.client_groups.name
        })) as GroupMembership[];
        
      } catch (error) {
        console.error('Error fetching client group memberships:', error);
        return [] as GroupMembership[];
      }
    },
    enabled: !!client.id
  });
  
  const addToGroupMutation = useMutation({
    mutationFn: async (data: { clientId: number, groupId: string }) => {
      // Check if relationship already exists
      const { data: existing, error: checkError } = await supabase
        .from('client_group_members')
        .select('*')
        .eq('client_id', data.clientId)
        .eq('group_id', data.groupId)
        .single();
        
      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError;
      }
      
      if (existing) {
        // Relationship already exists
        return existing;
      }
      
      // Add new relationship
      const { data: result, error } = await supabase
        .from('client_group_members')
        .insert([
          { 
            client_id: data.clientId,
            group_id: data.groupId
          }
        ])
        .select();
        
      if (error) throw error;
      return result[0];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientGroupMemberships'] });
      queryClient.invalidateQueries({ queryKey: ['clientGroups'] });
      toast.success('Cliente adicionado ao grupo');
      setShowAddToGroupDialog(false);
    },
    onError: (error: Error) => {
      toast.error(`Erro ao adicionar cliente ao grupo: ${error.message}`);
    }
  });
  
  const removeFromGroupMutation = useMutation({
    mutationFn: async (data: { clientId: number, groupId: string }) => {
      const { error } = await supabase
        .from('client_group_members')
        .delete()
        .eq('client_id', data.clientId)
        .eq('group_id', data.groupId);
        
      if (error) throw error;
      return { clientId: data.clientId, groupId: data.groupId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientGroupMemberships'] });
      queryClient.invalidateQueries({ queryKey: ['clientGroups'] });
      toast.success('Cliente removido do grupo');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao remover cliente do grupo: ${error.message}`);
    }
  });
  
  const handleAddToGroup = () => {
    if (selectedGroupId) {
      addToGroupMutation.mutate({ 
        clientId: client.id, 
        groupId: selectedGroupId 
      });
    }
  };
  
  const handleRemoveFromGroup = (groupId: string) => {
    removeFromGroupMutation.mutate({ 
      clientId: client.id, 
      groupId: groupId 
    });
  };
  
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="h-8">
            <Users className="h-4 w-4 mr-2" />
            Grupos
            {clientGroupMemberships.length > 0 && (
              <Badge className="ml-2" variant="secondary">
                {clientGroupMemberships.length}
              </Badge>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem onClick={() => setShowAddToGroupDialog(true)}>
            <PlusCircle className="h-4 w-4 mr-2" />
            Adicionar a um grupo
          </DropdownMenuItem>
          
          {clientGroupMemberships.length > 0 && (
            <div className="px-2 py-1.5 text-xs font-semibold">
              Grupos atuais:
            </div>
          )}
          
          {clientGroupMemberships.map(membership => (
            <DropdownMenuItem key={membership.groupId} className="flex justify-between items-center">
              <span>{membership.groupName}</span>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemoveFromGroup(membership.groupId);
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      
      <Dialog open={showAddToGroupDialog} onOpenChange={setShowAddToGroupDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Adicionar Cliente ao Grupo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Select
                value={selectedGroupId}
                onValueChange={setSelectedGroupId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um grupo" />
                </SelectTrigger>
                <SelectContent>
                  {isLoadingGroups ? (
                    <SelectItem value="loading" disabled>
                      Carregando grupos...
                    </SelectItem>
                  ) : clientGroups.length === 0 ? (
                    <SelectItem value="no-groups" disabled>
                      Nenhum grupo encontrado
                    </SelectItem>
                  ) : (
                    clientGroups
                      .filter((group: ClientGroup) => 
                        !clientGroupMemberships.some(m => m.groupId === group.id)
                      )
                      .map((group: ClientGroup) => (
                        <SelectItem key={group.id} value={group.id}>
                          {group.name}
                        </SelectItem>
                      ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              onClick={handleAddToGroup}
              disabled={!selectedGroupId}
            >
              <Check className="h-4 w-4 mr-2" />
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ClientGroupRelation;
