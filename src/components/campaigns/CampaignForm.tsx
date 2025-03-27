
import React from 'react';
import { Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface ClientGroup {
  id: number;
  name: string;
  count: number;
}

export interface AIProfile {
  id: number;
  name: string;
  description: string;
}

interface CampaignFormProps {
  newCampaign: {
    name: string;
    clientGroup: string;
    aiProfile: string;
  };
  onCampaignChange: (field: string, value: string) => void;
  onCreateCampaign: (e: React.FormEvent) => void;
  clientGroups: ClientGroup[];
}

const CampaignForm: React.FC<CampaignFormProps> = ({
  newCampaign,
  onCampaignChange,
  onCreateCampaign,
  clientGroups,
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Criar Nova Campanha</CardTitle>
        <CardDescription>
          Configure uma nova campanha de chamadas usando seu assistente de IA
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onCreateCampaign} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Campaign Name</Label>
            <Input
              id="name"
              placeholder="Summer Promotion 2023"
              value={newCampaign.name}
              onChange={(e) => onCampaignChange('name', e.target.value)}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="clientGroup">Select Client Group</Label>
            <Select
              value={newCampaign.clientGroup}
              onValueChange={(value) => onCampaignChange('clientGroup', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a client group" />
              </SelectTrigger>
              <SelectContent>
                {clientGroups.map((group) => (
                  <SelectItem key={group.id} value={group.id.toString()}>
                    {group.name} ({group.count} clients)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="aiProfile">AI Profile (Read Only)</Label>
            <Input
              id="aiProfile"
              value="Default Assistant (97141b30-c5bc-4234-babb-d38b79452e2a)"
              readOnly
              className="bg-muted cursor-not-allowed"
            />
            <p className="text-xs text-muted-foreground mt-1">
              This profile is configured by the administrator and cannot be changed.
            </p>
          </div>
          
          <div className="pt-4">
            <Button type="submit" className="w-full">
              <Save className="h-4 w-4 mr-2" />
              Create Campaign
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default CampaignForm;
