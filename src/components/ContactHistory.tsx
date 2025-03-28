import React, { useState, useEffect } from 'react';
import { 
  Search, 
  ChevronDown, 
  Phone, 
  BarChart, 
  UserCheck, 
  Clock, 
  CheckCircle2,
  XCircle, 
  AlertCircle, 
  Calendar, 
  FileText
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent
} from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import campaignService from '@/services/campaignService';
import { useAuth } from '@/contexts/AuthContext';

const ContactHistory = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedCall, setSelectedCall] = useState(null);
  const { user } = useAuth();

  // Fetch call history data
  const { data: callHistory, isLoading, error, refetch } = useQuery({
    queryKey: ['callHistory'],
    queryFn: async () => {
      try {
        return await campaignService.getCallHistory();
      } catch (error) {
        console.error("Error fetching call history:", error);
        return [];
      }
    }
  });

  useEffect(() => {
    refetch();
  }, [user, refetch]);

  // Filtered call history based on search query and status filter
  const filteredCallHistory = React.useMemo(() => {
    if (!callHistory) return [];

    return callHistory.filter(call => {
      const searchMatch =
        call.client_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        call.client_phone.includes(searchQuery) ||
        call.campaign_name.toLowerCase().includes(searchQuery.toLowerCase());

      const statusMatch = statusFilter ? call.status === statusFilter : true;

      return searchMatch && statusMatch;
    });
  }, [callHistory, searchQuery, statusFilter]);

  // Status options for the select filter
  const statusOptions = [
    { value: '', label: 'All Statuses' },
    { value: 'pending', label: 'Pending' },
    { value: 'called', label: 'Called' },
    { value: 'completed', label: 'Completed' },
    { value: 'failed', label: 'Failed' },
  ];

  // Function to format call duration from seconds to mm:ss
  const formatCallDuration = (durationInSeconds: number | undefined): string => {
    if (!durationInSeconds) return 'N/A';
    const minutes = Math.floor(durationInSeconds / 60);
    const seconds = durationInSeconds % 60;
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  return (
    <div className="container mx-auto p-4 max-w-7xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Contact History</CardTitle>
          <CardDescription>
            View a detailed history of all client interactions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="md:col-span-1">
              <Input
                type="search"
                placeholder="Search contacts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="md:col-span-1">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-1 flex justify-end">
              <Button onClick={() => refetch()}>
                <Calendar className="mr-2 h-4 w-4" />
                Atualizar
              </Button>
            </div>
          </div>
          <Separator />
          <div className="overflow-x-auto mt-4">
            {isLoading ? (
              <div className="flex items-center justify-center h-48">
                <Clock className="mr-2 h-6 w-6 animate-spin" />
                Loading call history...
              </div>
            ) : error ? (
              <div className="flex items-center justify-center h-48 text-red-500">
                <AlertCircle className="mr-2 h-6 w-6" />
                Error fetching call history.
              </div>
            ) : filteredCallHistory.length === 0 ? (
              <div className="flex items-center justify-center h-48 text-muted-foreground">
                <FileText className="mr-2 h-6 w-6" />
                No call history found.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client</TableHead>
                    <TableHead>Campaign</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCallHistory.map((call) => (
                    <TableRow key={call.id}>
                      <TableCell className="font-medium">{call.client_name}</TableCell>
                      <TableCell>{call.campaign_name}</TableCell>
                      <TableCell>
                        {call.status === 'completed' ? (
                          <Badge variant="outline">
                            <CheckCircle2 className="mr-2 h-4 w-4 text-green-500" />
                            Completed
                          </Badge>
                        ) : call.status === 'failed' ? (
                          <Badge variant="outline">
                            <XCircle className="mr-2 h-4 w-4 text-red-500" />
                            Failed
                          </Badge>
                        ) : (
                          call.status
                        )}
                      </TableCell>
                      <TableCell>
                        {new Date(call.call_date).toLocaleDateString()}
                      </TableCell>
                      <TableCell>{formatCallDuration(call.call_duration)}</TableCell>
                      <TableCell className="text-right">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelectedCall(call)}
                              >
                                View Details
                                <ChevronDown className="ml-2 h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>View details about this call.</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={selectedCall !== null} onOpenChange={() => setSelectedCall(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Call Details</DialogTitle>
            <DialogDescription>
              Information about the call with {selectedCall?.client_name}.
            </DialogDescription>
          </DialogHeader>
          {selectedCall && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="client" className="text-right">
                  Client:
                </Label>
                <Input
                  id="client"
                  value={selectedCall.client_name}
                  className="col-span-3"
                  readOnly
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="campaign" className="text-right">
                  Campaign:
                </Label>
                <Input
                  id="campaign"
                  value={selectedCall.campaign_name}
                  className="col-span-3"
                  readOnly
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="status" className="text-right">
                  Status:
                </Label>
                <Input
                  id="status"
                  value={selectedCall.status}
                  className="col-span-3"
                  readOnly
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="date" className="text-right">
                  Date:
                </Label>
                <Input
                  id="date"
                  value={new Date(selectedCall.call_date).toLocaleDateString()}
                  className="col-span-3"
                  readOnly
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="duration" className="text-right">
                  Duration:
                </Label>
                <Input
                  id="duration"
                  value={formatCallDuration(selectedCall.call_duration)}
                  className="col-span-3"
                  readOnly
                />
              </div>
              {selectedCall.call_summary && (
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="summary" className="text-right">
                    Summary:
                  </Label>
                  <Input
                    id="summary"
                    value={selectedCall.call_summary}
                    className="col-span-3"
                    readOnly
                  />
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ContactHistory;
