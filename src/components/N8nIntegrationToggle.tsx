
import React, { useEffect, useState } from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Copy } from 'lucide-react';
import { n8nWebhookService } from '@/services/n8nWebhookService';

const N8nIntegrationToggle: React.FC = () => {
  const [useN8n, setUseN8n] = useState<boolean>(
    localStorage.getItem('use_n8n_approach') === 'true'
  );
  
  const webhookUrl = n8nWebhookService.getWebhookUrl();
  
  useEffect(() => {
    localStorage.setItem('use_n8n_approach', useN8n.toString());
  }, [useN8n]);
  
  const handleCopyWebhookUrl = () => {
    navigator.clipboard.writeText(webhookUrl);
    toast.success("URL do webhook copiada para a área de transferência");
  };
  
  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle>Integração com n8n</CardTitle>
        <CardDescription>
          Configure como processar dados de chamadas completadas
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center space-x-2 mb-4">
          <Switch 
            id="n8n-toggle" 
            checked={useN8n}
            onCheckedChange={setUseN8n}
          />
          <Label htmlFor="n8n-toggle">
            {useN8n 
              ? "Usando método direto (sem Deno Edge Function)" 
              : "Usando Supabase Edge Function (Deno)"}
          </Label>
        </div>
        
        {useN8n && (
          <div className="mt-4 border rounded-md p-3 bg-secondary/5">
            <h4 className="text-sm font-medium mb-2">URL do Webhook para n8n</h4>
            <div className="flex">
              <Input 
                value={webhookUrl} 
                readOnly 
                className="flex-1 bg-background"
              />
              <Button 
                variant="outline" 
                size="icon" 
                className="ml-2" 
                onClick={handleCopyWebhookUrl}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Configure esta URL no seu fluxo do n8n para processar chamadas concluídas.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default N8nIntegrationToggle;
