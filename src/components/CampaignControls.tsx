
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent, 
  CardFooter 
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { DialogFooter } from '@/components/ui/dialog';
import { Play, Users } from 'lucide-react';
import { toast } from 'sonner';
import { useQueryClient, useMutation, useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { campaignService } from '@/services/campaignService';
import { clientGroupService } from '@/services/clientGroupService';
import { clientService } from '@/services/clientService';
import { useAuth } from '@/contexts/AuthContext';
import AssistantSelector from './AssistantSelector';

const formSchema = z.object({
  name: z.string().min(1, { message: "Nome da campanha é obrigatório" }),
  clientGroupId: z.string().min(1, { message: "Grupo de clientes é obrigatório" }),
});

export type FormValues = z.infer<typeof formSchema>;

const CampaignControls = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedAssistant, setSelectedAssistant] = useState<any>(null);
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      clientGroupId: '',
    },
  });
  
  // Fetch client groups
  const { data: clientGroups = [] } = useQuery({
    queryKey: ['clientGroups'],
    queryFn: clientGroupService.getClientGroups,
  });
  
  // Handle form submission to create campaign
  const startCampaign = async (values: FormValues) => {
    setIsLoading(true);
    try {
      if (!selectedAssistant) {
        toast.error("Por favor, selecione um assistente virtual");
        setIsLoading(false);
        return;
      }
      
      // 1. Create a new campaign
      const campaign = await campaignService.createCampaign({
        name: values.name,
        status: 'active',
        start_date: new Date().toISOString(),
      });
      
      if (!campaign || !campaign.id) {
        throw new Error("Falha ao criar campanha");
      }
      
      // 2. Get all clients from the selected group
      const clients = await clientService.getClientsByGroupId(values.clientGroupId);
      
      if (!clients || clients.length === 0) {
        toast.error("Não há clientes no grupo selecionado");
        // Reverter a criação da campanha
        await campaignService.updateCampaign(campaign.id, { status: 'stopped' });
        setIsLoading(false);
        return;
      }
      
      // 3. Add all clients to the campaign
      await campaignService.addClientsToCampaign(campaign.id, clients);
      
      // 4. Success notification
      toast.success("Campanha iniciada com sucesso!");
      queryClient.invalidateQueries({ queryKey: ['activeCampaigns'] });
      form.reset();
      
    } catch (error) {
      console.error("Erro ao iniciar campanha:", error);
      toast.error("Erro ao iniciar campanha");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAssistantSelected = (assistant: any) => {
    setSelectedAssistant(assistant);
  };
  
  return (
    <Card className="max-w-md w-full mx-auto">
      <CardHeader>
        <CardTitle>Iniciar Nova Campanha</CardTitle>
        <CardDescription>
          Configure e inicie uma nova campanha de ligações
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(startCampaign)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome da Campanha</FormLabel>
                  <FormControl>
                    <Input placeholder="Digite o nome da campanha" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="clientGroupId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Grupo de Clientes</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um grupo de clientes" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {clientGroups.length === 0 ? (
                        <SelectItem value="no-groups" disabled>
                          Nenhum grupo disponível
                        </SelectItem>
                      ) : (
                        clientGroups.map(group => (
                          <SelectItem key={group.id} value={group.id}>
                            <div className="flex items-center">
                              <Users className="h-4 w-4 mr-2" />
                              {group.name} 
                              {group.client_count && (
                                <span className="ml-2 text-muted-foreground">
                                  ({group.client_count} clientes)
                                </span>
                              )}
                            </div>
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-2">
              <FormLabel>Assistente Virtual</FormLabel>
              <AssistantSelector onAssistantSelected={handleAssistantSelected} />
              {!selectedAssistant && (
                <p className="text-sm text-destructive">
                  Selecione um assistente virtual
                </p>
              )}
            </div>
            
            <DialogFooter className="pt-4">
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <div className="flex items-center">
                    <div className="animate-spin h-4 w-4 mr-2 border-b-2 border-white rounded-full"></div>
                    Iniciando...
                  </div>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Iniciar Campanha
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

export default CampaignControls;
