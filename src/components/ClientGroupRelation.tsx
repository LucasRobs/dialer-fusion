
import React, { useState } from 'react';
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
        return await clientGroupService.getClientGroups();
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
        if (!client.id) return [];
        const groups = await clientGroupService.getClientGroupsByClientId(client.id);
        
        // Map the groups to the expected format
        return groups.map(group => ({
          groupId: group.id,
          groupName: group.name
        })) as GroupMembership[];
      } catch (error) {
        console.error('Error fetching client group memberships:', error);
        return [] as GroupMembership[];
      }
    },
    enabled: !!client.id
  });
  
  const addToGroupMutation = useMutation({
    mutationFn: async ({ clientId, groupId }: { clientId: number, groupId: string }) => {
      return await clientGroupService.addClientToGroup(clientId, groupId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientGroupMemberships'] });
      queryClient.invalidateQueries({ queryKey: ['clientGroups'] });
      queryClient.invalidateQueries({ queryKey: ['clientsInGroup'] });
      toast.success('Cliente adicionado ao grupo');
      setShowAddToGroupDialog(false);
      setSelectedGroupId('');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao adicionar cliente ao grupo: ${error.message}`);
    }
  });
  
  const removeFromGroupMutation = useMutation({
    mutationFn: async ({ clientId, groupId }: { clientId: number, groupId: string }) => {
      return await clientGroupService.removeClientFromGroup(clientId, groupId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientGroupMemberships'] });
      queryClient.invalidateQueries({ queryKey: ['clientGroups'] });
      queryClient.invalidateQueries({ queryKey: ['clientsInGroup'] });
      toast.success('Cliente removido do grupo');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao remover cliente do grupo: ${error.message}`);
    }
  });
  
  const handleAddToGroup = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (selectedGroupId) {
      addToGroupMutation.mutate({ 
        clientId: client.id, 
        groupId: selectedGroupId 
      });
    }
  };
  
  const handleRemoveFromGroup = (e: React.MouseEvent, groupId: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    removeFromGroupMutation.mutate({ 
      clientId: client.id, 
      groupId: groupId 
    });
  };
  
  const handleOpenDialog = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowAddToGroupDialog(true);
  };
  
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="h-8" onClick={(e) => e.stopPropagation()}>
            <Users className="h-4 w-4 mr-2" />
            Grupos
            {clientGroupMemberships.length > 0 && (
              <Badge className="ml-2" variant="secondary">
                {clientGroupMemberships.length}
              </Badge>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56" onClick={(e) => e.stopPropagation()}>
          <DropdownMenuItem onClick={handleOpenDialog}>
            <PlusCircle className="h-4 w-4 mr-2" />
            Adicionar a um grupo
          </DropdownMenuItem>
          
          {clientGroupMemberships.length > 0 && (
            <div className="px-2 py-1.5 text-xs font-semibold">
              Grupos atuais:
            </div>
          )}
          
          {clientGroupMemberships.map((membership: GroupMembership) => (
            <DropdownMenuItem key={membership.groupId} className="flex justify-between items-center">
              <span>{membership.groupName}</span>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                onClick={(e) => handleRemoveFromGroup(e, membership.groupId)}
              >
                <X className="h-4 w-4" />
              </Button>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      
      <Dialog open={showAddToGroupDialog} onOpenChange={(open) => {
        if (!open) setSelectedGroupId('');
        setShowAddToGroupDialog(open);
      }}>
        <DialogContent className="sm:max-w-md" onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle>Adicionar Cliente ao Grupo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Select
                value={selectedGroupId}
                onValueChange={setSelectedGroupId}
              >
                <SelectTrigger onClick={(e) => e.stopPropagation()}>
                  <SelectValue placeholder="Selecione um grupo" />
                </SelectTrigger>
                <SelectContent onClick={(e) => e.stopPropagation()}>
                  {isLoadingGroups ? (
                    <SelectItem value="loading">
                      Carregando grupos...
                    </SelectItem>
                  ) : clientGroups.length === 0 ? (
                    <SelectItem value="no-groups">
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
