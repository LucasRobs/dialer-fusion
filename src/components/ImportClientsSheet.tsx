
import React, { useState } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  Alert,
  AlertTitle,
  AlertDescription,
} from '@/components/ui/alert';
import { 
  Upload, 
  FileSpreadsheet,
  AlertTriangle,
  Check
} from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { clientService } from '@/services/clientService';
import { useToast } from '@/components/ui/use-toast';

interface ImportClientsSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

const ImportClientsSheet = ({ isOpen, onClose }: ImportClientsSheetProps) => {
  const [sheetUrl, setSheetUrl] = useState('');
  const [csvData, setCsvData] = useState('');
  const [importMethod, setImportMethod] = useState<'url' | 'paste'>('url');
  const [loading, setLoading] = useState(false);
  const [previewData, setPreviewData] = useState<any[] | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const importClientsMutation = useMutation({
    mutationFn: (clients: any[]) => clientService.importClients(clients),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast({
        title: "Clientes importados",
        description: `${data.length} clientes foram importados com sucesso.`,
      });
      handleClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao importar clientes",
        description: error.message,
        variant: "destructive"
      });
    }
  });
  
  const parseCSV = (text: string) => {
    const lines = text.split('\n').filter(line => line.trim());
    const headers = lines[0].split(',').map(header => header.trim());
    
    // Verificar se os cabeçalhos necessários estão presentes
    const requiredFields = ['name', 'phone'];
    const missingFields = requiredFields.filter(field => !headers.includes(field));
    
    if (missingFields.length > 0) {
      setValidationErrors([`Campos obrigatórios ausentes: ${missingFields.join(', ')}`]);
      return null;
    }
    
    const results = [];
    const errors = [];
    
    for (let i = 1; i < lines.length; i++) {
      const row = lines[i].split(',').map(cell => cell.trim());
      if (row.length !== headers.length) {
        errors.push(`Linha ${i+1}: número incorreto de campos`);
        continue;
      }
      
      const obj: any = {};
      headers.forEach((header, index) => {
        obj[header] = row[index];
      });
      
      // Validar dados
      if (!obj.name) {
        errors.push(`Linha ${i+1}: nome é obrigatório`);
      }
      
      if (!obj.phone) {
        errors.push(`Linha ${i+1}: telefone é obrigatório`);
      }
      
      // Se validar corretamente, adiciona ao resultado
      if (obj.name && obj.phone) {
        // Preparar objeto para importação
        results.push({
          name: obj.name,
          phone: obj.phone,
          email: obj.email || '',
          status: obj.status || 'Active'
        });
      }
    }
    
    setValidationErrors(errors);
    return errors.length === 0 ? results : null;
  };
  
  const fetchSheetData = async () => {
    try {
      setLoading(true);
      setValidationErrors([]);
      
      // Extrair o ID da planilha da URL
      const match = sheetUrl.match(/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
      if (!match) {
        setValidationErrors(['URL da planilha inválida']);
        setLoading(false);
        return;
      }
      
      const sheetId = match[1];
      const exportUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;
      
      const response = await fetch(exportUrl);
      if (!response.ok) {
        throw new Error('Não foi possível acessar a planilha. Verifique se ela está compartilhada publicamente.');
      }
      
      const text = await response.text();
      const parsedData = parseCSV(text);
      
      if (parsedData) {
        setPreviewData(parsedData);
      }
    } catch (error) {
      console.error('Erro ao buscar dados da planilha:', error);
      setValidationErrors([`Erro ao buscar dados: ${error instanceof Error ? error.message : 'Erro desconhecido'}`]);
    } finally {
      setLoading(false);
    }
  };
  
  const handlePasteData = () => {
    setValidationErrors([]);
    const parsedData = parseCSV(csvData);
    if (parsedData) {
      setPreviewData(parsedData);
    }
  };
  
  const handleImport = () => {
    if (previewData && previewData.length > 0) {
      importClientsMutation.mutate(previewData);
    }
  };
  
  const handleClose = () => {
    setSheetUrl('');
    setCsvData('');
    setPreviewData(null);
    setValidationErrors([]);
    onClose();
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Importar Clientes</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="flex space-x-2">
            <Button 
              variant={importMethod === 'url' ? 'default' : 'outline'}
              onClick={() => setImportMethod('url')}
              className="flex-1"
            >
              URL da Planilha
            </Button>
            <Button 
              variant={importMethod === 'paste' ? 'default' : 'outline'}
              onClick={() => setImportMethod('paste')}
              className="flex-1"
            >
              Colar Dados
            </Button>
          </div>
          
          {importMethod === 'url' ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Cole a URL de uma planilha do Google Sheets compartilhada publicamente.
                </p>
                <div className="flex space-x-2">
                  <Input 
                    placeholder="https://docs.google.com/spreadsheets/d/..." 
                    value={sheetUrl}
                    onChange={(e) => setSheetUrl(e.target.value)}
                  />
                  <Button 
                    onClick={fetchSheetData} 
                    disabled={!sheetUrl || loading}
                  >
                    {loading ? (
                      <div className="animate-spin h-4 w-4 border-b-2 border-white rounded-full mr-2" />
                    ) : (
                      <FileSpreadsheet className="h-4 w-4 mr-2" />
                    )}
                    Carregar
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Cole os dados CSV. A primeira linha deve conter os cabeçalhos (name, phone, email, status).
                </p>
                <Textarea 
                  placeholder="name,phone,email,status&#10;João Silva,11999998888,joao@email.com,Active&#10;Maria Santos,11999997777,maria@email.com,Active" 
                  value={csvData}
                  onChange={(e) => setCsvData(e.target.value)}
                  className="min-h-[150px]"
                />
                <Button 
                  onClick={handlePasteData} 
                  disabled={!csvData}
                >
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Validar Dados
                </Button>
              </div>
            </div>
          )}
          
          {validationErrors.length > 0 && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Erros de validação</AlertTitle>
              <AlertDescription>
                <ul className="list-disc list-inside">
                  {validationErrors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}
          
          {previewData && previewData.length > 0 && (
            <div className="border rounded-md p-4">
              <h3 className="font-medium mb-2">Visualização dos dados ({previewData.length} clientes)</h3>
              <div className="max-h-[200px] overflow-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted border-b">
                      <th className="text-left p-2">Nome</th>
                      <th className="text-left p-2">Telefone</th>
                      <th className="text-left p-2">Email</th>
                      <th className="text-left p-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.slice(0, 5).map((client, index) => (
                      <tr key={index} className="border-b">
                        <td className="p-2">{client.name}</td>
                        <td className="p-2">{client.phone}</td>
                        <td className="p-2">{client.email || '-'}</td>
                        <td className="p-2">{client.status || 'Active'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {previewData.length > 5 && (
                  <p className="text-xs text-muted-foreground mt-2 text-center">
                    ... e mais {previewData.length - 5} clientes
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
        
        <DialogFooter className="space-x-2">
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button 
            disabled={!previewData || previewData.length === 0 || importClientsMutation.isPending}
            onClick={handleImport}
          >
            {importClientsMutation.isPending ? (
              <div className="animate-spin h-4 w-4 border-b-2 border-white rounded-full mr-2" />
            ) : (
              <Check className="h-4 w-4 mr-2" />
            )}
            Importar {previewData?.length || 0} Clientes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ImportClientsSheet;
