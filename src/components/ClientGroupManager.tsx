
import React, { useState } from 'react';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardContent 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { ClientGroup } from '@/services/clientGroupService';
import GroupClientsList from './GroupClientsList';
import CreateGroupDialog from './groups/CreateGroupDialog';
import EditGroupDialog from './groups/EditGroupDialog';
import DeleteGroupDialog from './groups/DeleteGroupDialog';
import GroupsList from './groups/GroupsList';

const ClientGroupManager = () => {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showClientsDialog, setShowClientsDialog] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<ClientGroup | null>(null);
  
  const handleShowClients = (group: ClientGroup) => {
    setSelectedGroup(group);
    setShowClientsDialog(true);
  };
  
  const handleEdit = (group: ClientGroup) => {
    setSelectedGroup(group);
    setShowEditDialog(true);
  };
  
  const handleDelete = (group: ClientGroup) => {
    setSelectedGroup(group);
    setShowDeleteDialog(true);
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
          <GroupsList 
            onShowClients={handleShowClients}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        </CardContent>
      </Card>
      
      {/* Dialogs */}
      <CreateGroupDialog 
        isOpen={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
      />
      
      <EditGroupDialog 
        isOpen={showEditDialog}
        onClose={() => setShowEditDialog(false)}
        selectedGroup={selectedGroup}
      />
      
      <DeleteGroupDialog 
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        selectedGroup={selectedGroup}
      />

      {/* Clients in Group Dialog */}
      {selectedGroup && (
        <GroupClientsList 
          groupId={selectedGroup.id}
          groupName={selectedGroup.name}
          isOpen={showClientsDialog}
          onClose={() => setShowClientsDialog(false)}
        />
      )}
    </div>
  );
};

export default ClientGroupManager;
