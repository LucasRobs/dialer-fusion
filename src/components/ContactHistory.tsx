
import React, { useState } from 'react';
import { 
  Search, 
  Download, 
  ChevronDown, 
  Phone, 
  Clock, 
  Calendar, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  MessageSquare,
  Headphones,
  User
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
  DialogFooter 
} from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Card,
  CardContent
} from '@/components/ui/card';

// Dummy call history data
const dummyHistory = [
  { 
    id: 1, 
    clientName: 'John Smith', 
    phone: '(555) 123-4567', 
    date: '2023-08-15', 
    time: '10:25 AM', 
    duration: '2:45', 
    status: 'Completed', 
    outcome: 'Interested',
    campaign: 'Summer Promotion 2023',
    notes: 'Client expressed interest in the premium plan, requested follow-up materials via email.'
  },
  { 
    id: 2, 
    clientName: 'Sarah Johnson', 
    phone: '(555) 234-5678', 
    date: '2023-08-15', 
    time: '11:10 AM', 
    duration: '3:20', 
    status: 'Completed', 
    outcome: 'Conversion',
    campaign: 'Summer Promotion 2023',
    notes: 'Client purchased the basic plan during the call. Very satisfied with the offer.'
  },
  { 
    id: 3, 
    clientName: 'Michael Brown', 
    phone: '(555) 345-6789', 
    date: '2023-08-15', 
    time: '1:45 PM', 
    duration: '0:45', 
    status: 'Completed', 
    outcome: 'Not Interested',
    campaign: 'Summer Promotion 2023',
    notes: 'Client was not interested at this time. Currently using a competitor service.'
  },
  { 
    id: 4, 
    clientName: 'Emily Davis', 
    phone: '(555) 456-7890', 
    date: '2023-08-14', 
    time: '9:30 AM', 
    duration: '1:15', 
    status: 'Completed', 
    outcome: 'Follow-up Required',
    campaign: 'Summer Promotion 2023',
    notes: 'Client requested to be called back next month when their current contract expires.'
  },
  { 
    id: 5, 
    clientName: 'Robert Wilson', 
    phone: '(555) 567-8901', 
    date: '2023-08-14', 
    time: '2:50 PM', 
    duration: '0:00', 
    status: 'No Answer', 
    outcome: 'N/A',
    campaign: 'Summer Promotion 2023',
    notes: 'No answer after 6 rings.'
  },
  { 
    id: 6, 
    clientName: 'Jennifer Taylor', 
    phone: '(555) 678-9012', 
    date: '2023-08-14', 
    time: '4:15 PM', 
    duration: '0:10', 
    status: 'Voicemail', 
    outcome: 'Message Left',
    campaign: 'Summer Promotion 2023',
    notes: 'Left voicemail with call-back information and brief promotion details.'
  },
  { 
    id: 7, 
    clientName: 'David Martinez', 
    phone: '(555) 789-0123', 
    date: '2023-08-13', 
    time: '11:00 AM', 
    duration: '4:30', 
    status: 'Completed', 
    outcome: 'Conversion',
    campaign: 'Customer Feedback',
    notes: 'Client provided detailed feedback and signed up for the premium plan.'
  },
  { 
    id: 8, 
    clientName: 'Amanda Anderson', 
    phone: '(555) 890-1234', 
    date: '2023-08-13', 
    time: '1:05 PM', 
    duration: '0:00', 
    status: 'Rejected', 
    outcome: 'N/A',
    campaign: 'Customer Feedback',
    notes: 'Call was explicitly rejected.'
  },
];

const ContactHistory = () => {
  const [history, setHistory] = useState(dummyHistory);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedContact, setSelectedContact] = useState<any | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [outcomeFilter, setOutcomeFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  
  const { toast } = useToast();

  const handleExport = () => {
    // In a real app, this would generate and download a CSV/Excel file
    toast({
      title: "Export started",
      description: "Your contact history is being exported."
    });
  };

  const viewContactDetails = (contact: any) => {
    setSelectedContact(contact);
    setDialogOpen(true);
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'Completed':
        return 'bg-secondary text-white';
      case 'No Answer':
        return 'bg-yellow-500/80 text-white';
      case 'Voicemail':
        return 'bg-blue-500/80 text-white';
      case 'Rejected':
        return 'bg-destructive/80 text-white';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getOutcomeBadgeColor = (outcome: string) => {
    switch (outcome) {
      case 'Interested':
        return 'bg-blue-500/80 text-white';
      case 'Conversion':
        return 'bg-secondary text-white';
      case 'Not Interested':
        return 'bg-destructive/80 text-white';
      case 'Follow-up Required':
        return 'bg-yellow-500/80 text-white';
      case 'Message Left':
        return 'bg-gray-500/80 text-white';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  // Filter history based on search term and filters
  const filteredHistory = history.filter((item) => {
    // Search term filter
    const matchesSearch = item.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.phone.includes(searchTerm) ||
                         item.campaign.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Status filter
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    
    // Outcome filter
    const matchesOutcome = outcomeFilter === 'all' || item.outcome === outcomeFilter;
    
    // Date filter
    let matchesDate = true;
    const itemDate = new Date(item.date);
    const today = new Date();
    
    if (dateFilter === 'today') {
      matchesDate = item.date === today.toISOString().split('T')[0];
    } else if (dateFilter === 'yesterday') {
      const yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 1);
      matchesDate = item.date === yesterday.toISOString().split('T')[0];
    } else if (dateFilter === 'lastWeek') {
      const lastWeek = new Date(today);
      lastWeek.setDate(today.getDate() - 7);
      matchesDate = itemDate >= lastWeek;
    }
    
    return matchesSearch && matchesStatus && matchesOutcome && matchesDate;
  });

  return (
    <div className="container mx-auto p-4 max-w-7xl">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <h1 className="text-3xl font-bold mb-4 md:mb-0">Contact History</h1>
        
        <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search contacts..."
              className="pl-8 w-full"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <Button variant="outline" size="sm" onClick={handleExport} className="whitespace-nowrap">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>
      
      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-2 mb-6">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger>
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="Completed">Completed</SelectItem>
            <SelectItem value="No Answer">No Answer</SelectItem>
            <SelectItem value="Voicemail">Voicemail</SelectItem>
            <SelectItem value="Rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
        
        <Select value={outcomeFilter} onValueChange={setOutcomeFilter}>
          <SelectTrigger>
            <SelectValue placeholder="Outcome" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Outcomes</SelectItem>
            <SelectItem value="Interested">Interested</SelectItem>
            <SelectItem value="Conversion">Conversion</SelectItem>
            <SelectItem value="Not Interested">Not Interested</SelectItem>
            <SelectItem value="Follow-up Required">Follow-up Required</SelectItem>
            <SelectItem value="Message Left">Message Left</SelectItem>
          </SelectContent>
        </Select>
        
        <Select value={dateFilter} onValueChange={setDateFilter}>
          <SelectTrigger>
            <SelectValue placeholder="Time Period" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Time</SelectItem>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="yesterday">Yesterday</SelectItem>
            <SelectItem value="lastWeek">Last 7 Days</SelectItem>
          </SelectContent>
        </Select>
        
        <Button variant="outline" size="sm" onClick={() => {
          setStatusFilter('all');
          setOutcomeFilter('all');
          setDateFilter('all');
          setSearchTerm('');
        }} className="whitespace-nowrap">
          Clear Filters
        </Button>
      </div>
      
      {/* History Table */}
      <div className="border rounded-lg overflow-hidden glass">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Client</TableHead>
              <TableHead className="hidden md:table-cell">Phone</TableHead>
              <TableHead className="hidden lg:table-cell">Campaign</TableHead>
              <TableHead className="hidden md:table-cell">Date & Time</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden sm:table-cell">Outcome</TableHead>
              <TableHead className="text-right">Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredHistory.length > 0 ? (
              filteredHistory.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <div className="font-medium truncate max-w-[150px]">{item.clientName}</div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">{item.phone}</TableCell>
                  <TableCell className="hidden lg:table-cell truncate max-w-[150px]">{item.campaign}</TableCell>
                  <TableCell className="hidden md:table-cell">
                    <div className="flex flex-col text-sm">
                      <span>{item.date}</span>
                      <span className="text-muted-foreground">{item.time}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded-full text-xs ${getStatusBadgeColor(item.status)}`}>
                      {item.status}
                    </span>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    {item.outcome !== 'N/A' ? (
                      <span className={`px-2 py-1 rounded-full text-xs ${getOutcomeBadgeColor(item.outcome)}`}>
                        {item.outcome}
                      </span>
                    ) : (
                      <span>—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => viewContactDetails(item)}
                    >
                      View
                      <ChevronDown className="ml-1 h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No contact history found. Try adjusting your filters.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      
      {/* Contact Details Dialog */}
      {selectedContact && (
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Contact Details</DialogTitle>
            </DialogHeader>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
              <Card>
                <CardContent className="p-4 space-y-4">
                  <div className="flex justify-between items-start">
                    <h3 className="font-semibold">Client Information</h3>
                    <User className="h-5 w-5 text-muted-foreground" />
                  </div>
                  
                  <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-1 py-1 border-b">
                      <div className="text-sm text-muted-foreground">Name</div>
                      <div className="col-span-2 font-medium">{selectedContact.clientName}</div>
                    </div>
                    <div className="grid grid-cols-3 gap-1 py-1 border-b">
                      <div className="text-sm text-muted-foreground">Phone</div>
                      <div className="col-span-2">{selectedContact.phone}</div>
                    </div>
                    <div className="grid grid-cols-3 gap-1 py-1 border-b">
                      <div className="text-sm text-muted-foreground">Campaign</div>
                      <div className="col-span-2">{selectedContact.campaign}</div>
                    </div>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row justify-end gap-2 pt-2">
                    <Button variant="outline" size="sm" className="flex items-center gap-1.5">
                      <Phone className="h-4 w-4" />
                      Call Now
                    </Button>
                    <Button size="sm" className="flex items-center gap-1.5">
                      <MessageSquare className="h-4 w-4" />
                      Add Note
                    </Button>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4 space-y-4">
                  <div className="flex justify-between items-start">
                    <h3 className="font-semibold">Call Details</h3>
                    <Phone className="h-5 w-5 text-muted-foreground" />
                  </div>
                  
                  <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-1 py-1 border-b">
                      <div className="text-sm text-muted-foreground">Date</div>
                      <div className="col-span-2">{selectedContact.date}</div>
                    </div>
                    <div className="grid grid-cols-3 gap-1 py-1 border-b">
                      <div className="text-sm text-muted-foreground">Time</div>
                      <div className="col-span-2">{selectedContact.time}</div>
                    </div>
                    <div className="grid grid-cols-3 gap-1 py-1 border-b">
                      <div className="text-sm text-muted-foreground">Duration</div>
                      <div className="col-span-2 flex items-center">
                        <Clock className="h-4 w-4 mr-1.5 text-muted-foreground" />
                        {selectedContact.duration}
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-1 py-1 border-b">
                      <div className="text-sm text-muted-foreground">Status</div>
                      <div className="col-span-2">
                        <span className={`px-2 py-1 rounded-full text-xs ${getStatusBadgeColor(selectedContact.status)}`}>
                          {selectedContact.status}
                        </span>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-1 py-1 border-b">
                      <div className="text-sm text-muted-foreground">Outcome</div>
                      <div className="col-span-2">
                        {selectedContact.outcome !== 'N/A' ? (
                          <span className={`px-2 py-1 rounded-full text-xs ${getOutcomeBadgeColor(selectedContact.outcome)}`}>
                            {selectedContact.outcome}
                          </span>
                        ) : (
                          <span>—</span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {selectedContact.status === 'Completed' && (
                    <div className="flex justify-end pt-2">
                      <Button variant="outline" size="sm" className="flex items-center gap-1.5">
                        <Headphones className="h-4 w-4" />
                        Listen to Recording
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
              
              <Card className="md:col-span-2">
                <CardContent className="p-4 space-y-2">
                  <h3 className="font-semibold">Notes</h3>
                  <p className="text-foreground/80">{selectedContact.notes}</p>
                </CardContent>
              </Card>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default ContactHistory;
