
import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetFooter 
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  Calendar, 
  Save, 
  Users, 
  UserPlus, 
  AlarmClock, 
  CalendarIcon 
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { clientService } from "@/services/clientService";
import { campaignService } from "@/services/campaignService";
import { useMutation, useQuery } from '@tanstack/react-query';
import { clientGroupService } from "@/services/clientGroupService";
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

export default function CampaignControls() {
  const { user } = useAuth();
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<string>("");
  const [clientGroups, setClientGroups] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Load client groups
  const { data: groupsData, isLoading: loadingGroups } = useQuery({
    queryKey: ['clientGroups'],
    queryFn: async () => {
      try {
        return await clientGroupService.getClientGroups();
      } catch (error) {
        console.error("Erro ao carregar grupos de clientes:", error);
        toast.error("Erro ao carregar grupos de clientes");
        return [];
      }
    }
  });
  
  useEffect(() => {
    if (groupsData) {
      setClientGroups(groupsData);
    }
  }, [groupsData]);
  
  // Create form
  const form = useForm({
    defaultValues: {
      name: "",
      clientGroupId: "",
      scheduleDate: new Date(),
      scheduleTime: "09:00",
    }
  });
  
  // Create campaign mutation
  const createCampaignMutation = useMutation({
    mutationFn: async (campaignData: any) => {
      return await campaignService.createCampaign({
        name: campaignData.name,
        status: "pending",
        user_id: user?.id
      });
    }
  });
  
  // Add clients to campaign mutation
  const addClientsToCampaignMutation = useMutation({
    mutationFn: async ({ campaignId, clientGroupId }: { campaignId: number, clientGroupId: string }) => {
      const clients = await clientService.getClientsByGroupId(clientGroupId);
      if (clients.length > 0) {
        return await campaignService.addClientsToCampaign(campaignId, clients);
      }
      return null;
    }
  });
  
  const onSubmit = async (data: any) => {
    try {
      setIsLoading(true);
      
      // First create the campaign
      const campaign = await createCampaignMutation.mutateAsync({
        name: data.name,
        status: "pending",
        user_id: user?.id
      });
      
      // Then add clients from the selected group
      if (data.clientGroupId) {
        await addClientsToCampaignMutation.mutateAsync({
          campaignId: campaign.id,
          clientGroupId: data.clientGroupId
        });
      }
      
      toast.success("Campanha criada com sucesso!");
      setIsSheetOpen(false);
      form.reset();
    } catch (error: any) {
      toast.error(`Erro ao criar campanha: ${error.message}`);
      console.error("Erro ao criar campanha:", error);
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="flex space-x-2">
      <Button 
        variant="outline" 
        onClick={() => setIsSheetOpen(true)}
      >
        <Calendar className="h-4 w-4 mr-2" />
        Nova Campanha
      </Button>
      
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Criar Nova Campanha</SheetTitle>
          </SheetHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome da Campanha</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Campanha de Outono" {...field} />
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
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um grupo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {clientGroups.map((group) => (
                          <SelectItem key={group.id} value={group.id}>
                            {group.name} ({group.client_count || 0} clientes)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="scheduleDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Data</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Escolha uma data</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarComponent
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => date < new Date()}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="scheduleTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Horário</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <SheetFooter className="pt-4">
                <Button 
                  type="submit" 
                  disabled={isLoading}
                >
                  <Save className="h-4 w-4 mr-2" />
                  {isLoading ? 'Salvando...' : 'Salvar Campanha'}
                </Button>
              </SheetFooter>
            </form>
          </Form>
        </SheetContent>
      </Sheet>
    </div>
  );
}
