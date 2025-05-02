
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Send, Phone } from 'lucide-react';
import { webhookService, VapiAssistant } from '@/services/webhookService';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

const VapiAssistantTransfer = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [selectedAssistantId, setSelectedAssistantId] = useState<string>('');
  const [selectedPhoneNumber, setSelectedPhoneNumber] = useState<string>('');
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  const [firstMessage, setFirstMessage] = useState<string>('');
  const [isSending, setIsSending] = useState<boolean>(false);
  const [clients, setClients] = useState<any[]>([]);
  const [isLoadingClients, setIsLoadingClients] = useState<boolean>(false);

  // Fetch assistants
  const { data: assistants, isLoading: isLoadingAssistants } = useQuery({
    queryKey: ['assistants', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      return webhookService.getAllAssistants(user.id);
    },
    enabled: !!user?.id,
  });

  // Fetch clients when component mounts
  useEffect(() => {
    const fetchClients = async () => {
      if (!user?.id) return;
      
      setIsLoadingClients(true);
      try {
        const { data, error } = await supabase
          .from('clients')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
          
        if (error) {
          console.error('Error fetching clients:', error);
          toast({
            title: 'Error',
            description: 'Failed to load clients',
            variant: 'destructive',
          });
        } else {
          setClients(data || []);
        }
      } catch (error) {
        console.error('Exception fetching clients:', error);
      } finally {
        setIsLoadingClients(false);
      }
    };
    
    fetchClients();
  }, [user?.id, toast]);

  // Load selected assistant from localStorage
  useEffect(() => {
    try {
      const storedAssistant = localStorage.getItem('selected_assistant');
      if (storedAssistant) {
        const assistant = JSON.parse(storedAssistant);
        if (assistant && assistant.assistant_id) {
          setSelectedAssistantId(assistant.assistant_id);
          
          // If the assistant has a first message, use it
          if (assistant.first_message) {
            setFirstMessage(assistant.first_message);
          }
        }
      } else if (assistants && assistants.length > 0) {
        // Select first assistant
        const firstAssistant = assistants[0];
        setSelectedAssistantId(firstAssistant.assistant_id);
        
        // If the assistant has a first message, use it
        if (firstAssistant.first_message) {
          setFirstMessage(firstAssistant.first_message);
        }
      }
    } catch (error) {
      console.error('Error loading selected assistant from localStorage:', error);
    }
  }, [assistants]);

  const handleClientChange = (clientId: string) => {
    const id = parseInt(clientId, 10);
    setSelectedClientId(id);
    
    // Find the client to get their phone number
    const client = clients.find(c => c.id === id);
    if (client && client.phone) {
      setSelectedPhoneNumber(client.phone);
    } else {
      setSelectedPhoneNumber('');
    }
  };

  const handleSendMessage = async () => {
    if (!selectedAssistantId) {
      toast({
        title: 'Error',
        description: 'Please select an assistant',
        variant: 'destructive',
      });
      return;
    }

    if (!selectedPhoneNumber) {
      toast({
        title: 'Error',
        description: 'Please enter a phone number',
        variant: 'destructive',
      });
      return;
    }

    setIsSending(true);
    try {
      const result = await webhookService.sendFirstMessageToWebhook(
        selectedAssistantId,
        selectedPhoneNumber,
        selectedClientId || 0,
        firstMessage || "Olá, como posso ajudar?"
      );

      if (result && result.success) {
        toast({
          title: 'Success',
          description: 'Message sent successfully',
        });
      } else {
        toast({
          title: 'Error',
          description: result?.message || 'Failed to send message',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: 'Error',
        description: 'An error occurred while sending the message',
        variant: 'destructive',
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Send WhatsApp Message</CardTitle>
        <CardDescription>
          Send a message to a client using your virtual assistant
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="assistant">Select Assistant</Label>
          <Select
            value={selectedAssistantId}
            onValueChange={setSelectedAssistantId}
            disabled={isLoadingAssistants}
          >
            <SelectTrigger id="assistant">
              <SelectValue placeholder={isLoadingAssistants ? "Loading assistants..." : "Select an assistant"} />
            </SelectTrigger>
            <SelectContent>
              {assistants?.map((assistant: VapiAssistant) => (
                <SelectItem key={assistant.assistant_id} value={assistant.assistant_id}>
                  {assistant.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="client">Select Client</Label>
          <Select
            value={selectedClientId?.toString() || ''}
            onValueChange={handleClientChange}
            disabled={isLoadingClients}
          >
            <SelectTrigger id="client">
              <SelectValue placeholder={isLoadingClients ? "Loading clients..." : "Select a client"} />
            </SelectTrigger>
            <SelectContent>
              {clients.map((client) => (
                <SelectItem key={client.id} value={client.id.toString()}>
                  {client.name} {client.phone ? `(${client.phone})` : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">Phone Number</Label>
          <Input
            id="phone"
            value={selectedPhoneNumber}
            onChange={(e) => setSelectedPhoneNumber(e.target.value)}
            placeholder="+1234567890"
          />
          <p className="text-xs text-muted-foreground">
            Include country code (e.g., +55 for Brazil)
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="message">First Message</Label>
          <Textarea
            id="message"
            value={firstMessage}
            onChange={(e) => setFirstMessage(e.target.value)}
            placeholder="Hello! How can I help you today?"
            rows={3}
          />
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" disabled={isSending}>
          <Phone className="mr-2 h-4 w-4" />
          Make Call
        </Button>
        <Button onClick={handleSendMessage} disabled={isSending}>
          {isSending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Sending...
            </>
          ) : (
            <>
              <Send className="mr-2 h-4 w-4" />
              Send Message
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default VapiAssistantTransfer;
