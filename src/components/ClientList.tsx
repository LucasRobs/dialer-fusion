
import React, { useState } from 'react';
import { 
  Pencil, 
  Trash2, 
  Download, 
  Upload, 
  Search, 
  Plus,
  Phone
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
  DialogFooter,
  DialogTrigger
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';

// Dummy client data
const dummyClients = [
  { id: 1, name: 'John Smith', phone: '(555) 123-4567', email: 'john.smith@example.com', status: 'Active' },
  { id: 2, name: 'Sarah Johnson', phone: '(555) 234-5678', email: 'sarah.j@example.com', status: 'Active' },
  { id: 3, name: 'Michael Brown', phone: '(555) 345-6789', email: 'michael.b@example.com', status: 'Inactive' },
  { id: 4, name: 'Emily Davis', phone: '(555) 456-7890', email: 'emily.d@example.com', status: 'Active' },
  { id: 5, name: 'Robert Wilson', phone: '(555) 567-8901', email: 'robert.w@example.com', status: 'Active' },
  { id: 6, name: 'Jennifer Taylor', phone: '(555) 678-9012', email: 'jennifer.t@example.com', status: 'Inactive' },
  { id: 7, name: 'David Martinez', phone: '(555) 789-0123', email: 'david.m@example.com', status: 'Active' },
  { id: 8, name: 'Amanda Anderson', phone: '(555) 890-1234', email: 'amanda.a@example.com', status: 'Active' },
];

const ClientList = () => {
  const [clients, setClients] = useState(dummyClients);
  const [searchTerm, setSearchTerm] = useState('');
  const [newClient, setNewClient] = useState({ name: '', phone: '', email: '', status: 'Active' });
  const [editingClient, setEditingClient] = useState<any | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  
  const { toast } = useToast();

  const filteredClients = clients.filter(client => 
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.phone.includes(searchTerm) ||
    client.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleEdit = (client: any) => {
    setEditingClient(client);
    setIsEditing(true);
    setDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    setClients(clients.filter(client => client.id !== id));
    toast({
      title: "Client deleted",
      description: "The client has been removed from your database."
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isEditing && editingClient) {
      // Update existing client
      setClients(clients.map(client => 
        client.id === editingClient.id ? { ...editingClient } : client
      ));
      toast({
        title: "Client updated",
        description: "The client information has been updated successfully."
      });
    } else {
      // Add new client
      const id = Math.max(0, ...clients.map(c => c.id)) + 1;
      setClients([...clients, { ...newClient, id }]);
      toast({
        title: "Client added",
        description: "New client has been added to your database."
      });
    }
    
    setDialogOpen(false);
    setNewClient({ name: '', phone: '', email: '', status: 'Active' });
    setEditingClient(null);
    setIsEditing(false);
  };

  const handleExport = () => {
    // In a real app, this would generate and download a CSV/Excel file
    toast({
      title: "Export started",
      description: "Your client list is being exported."
    });
  };

  const handleImport = () => {
    // In a real app, this would open a file selector and process the file
    toast({
      title: "Import feature",
      description: "Import functionality would be implemented here."
    });
  };

  const resetForm = () => {
    setNewClient({ name: '', phone: '', email: '', status: 'Active' });
    setEditingClient(null);
    setIsEditing(false);
  };

  const openAddDialog = () => {
    resetForm();
    setIsEditing(false);
    setDialogOpen(true);
  };

  return (
    <div className="container mx-auto p-4 max-w-7xl">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <h1 className="text-3xl font-bold mb-4 md:mb-0">Client Database</h1>
        
        <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search clients..."
              className="pl-8 w-full"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleExport} className="whitespace-nowrap">
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
            <Button variant="outline" size="sm" onClick={handleImport} className="whitespace-nowrap">
              <Upload className="mr-2 h-4 w-4" />
              Import
            </Button>
            <Button size="sm" onClick={openAddDialog} className="whitespace-nowrap">
              <Plus className="mr-2 h-4 w-4" />
              Add Client
            </Button>
          </div>
        </div>
      </div>
      
      <div className="border rounded-lg overflow-hidden glass">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">#</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead className="hidden md:table-cell">Email</TableHead>
              <TableHead className="hidden md:table-cell">Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredClients.length > 0 ? (
              filteredClients.map((client) => (
                <TableRow key={client.id}>
                  <TableCell className="font-medium">{client.id}</TableCell>
                  <TableCell>{client.name}</TableCell>
                  <TableCell>{client.phone}</TableCell>
                  <TableCell className="hidden md:table-cell">{client.email}</TableCell>
                  <TableCell className="hidden md:table-cell">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      client.status === 'Active' 
                        ? 'bg-secondary/20 text-secondary' 
                        : 'bg-muted text-muted-foreground'
                    }`}>
                      {client.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(client)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(client.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon">
                        <Phone className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No clients found. Try adjusting your search or add new clients.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      
      {/* Add/Edit Client Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{isEditing ? 'Edit Client' : 'Add New Client'}</DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4 pt-4">
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  placeholder="John Smith"
                  value={isEditing ? editingClient?.name : newClient.name}
                  onChange={(e) => isEditing 
                    ? setEditingClient({...editingClient, name: e.target.value})
                    : setNewClient({...newClient, name: e.target.value})
                  }
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  placeholder="(555) 123-4567"
                  value={isEditing ? editingClient?.phone : newClient.phone}
                  onChange={(e) => isEditing 
                    ? setEditingClient({...editingClient, phone: e.target.value})
                    : setNewClient({...newClient, phone: e.target.value})
                  }
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="john.smith@example.com"
                  value={isEditing ? editingClient?.email : newClient.email}
                  onChange={(e) => isEditing 
                    ? setEditingClient({...editingClient, email: e.target.value})
                    : setNewClient({...newClient, email: e.target.value})
                  }
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <select
                  id="status"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={isEditing ? editingClient?.status : newClient.status}
                  onChange={(e) => isEditing 
                    ? setEditingClient({...editingClient, status: e.target.value})
                    : setNewClient({...newClient, status: e.target.value})
                  }
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
            </div>
            
            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">
                {isEditing ? 'Save Changes' : 'Add Client'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ClientList;
