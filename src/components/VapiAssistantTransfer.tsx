
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription,
  CardFooter
} from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { Brain, Upload, Check, Send } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { VOICE_SETTINGS } from '@/lib/supabase';
import { webhookService } from '@/services/webhookService';

interface VapiAssistantParams {
  name: string;
  description: string;
  instructions: string;
  exampleDialogs: {question: string; answer: string}[];
  voice: string;
  voiceId: string;
}

// Define a mapping of voice names to IDs
const AVAILABLE_VOICES = [
  {
    name: VOICE_SETTINGS.PTBR_FEMALE.name,
    id: VOICE_SETTINGS.PTBR_FEMALE.id,
  },
  {
    name: "Voz Masculina (EN)",
    id: "onwK4e9ZLuTAKqWW03F9", // Daniel
  },
  {
    name: "Voz Feminina (EN)",
    id: "EXAVITQu4vr4xnSDxMaL", // Sarah
  },
  {
    name: "Voz Neutra (EN)",
    id: "flq6f7yk4E4fJM5XTYuZ", // Nova
  },
];

const VapiAssistantTransfer = () => {
  const [assistantData, setAssistantData] = useState<VapiAssistantParams>({
    name: '',
    description: '',
    instructions: '',
    exampleDialogs: [
      { question: 'Quais serviços vocês oferecem?', answer: 'Oferecemos uma variedade de serviços incluindo...' },
      { question: 'Como entro em contato com o suporte?', answer: 'Você pode entrar em contato com nossa equipe de suporte...' }
    ],
    voice: VOICE_SETTINGS.PTBR_FEMALE.name,
    voiceId: VOICE_SETTINGS.PTBR_FEMALE.id
  });

  const [activeTab, setActiveTab] = useState('basic');
  const [newQuestion, setNewQuestion] = useState('');
  const [newAnswer, setNewAnswer] = useState('');
  const [isTransferring, setIsTransferring] = useState(false);
  const [transferComplete, setTransferComplete] = useState(false);
  const [vapiAssistantId, setVapiAssistantId] = useState('');
  const [isSendingFirstMessage, setIsSendingFirstMessage] = useState(false);
  const [firstMessageSent, setFirstMessageSent] = useState(false);
  
  const { toast } = useToast();
  
  const handleInputChange = (field: keyof VapiAssistantParams, value: string) => {
    setAssistantData({
      ...assistantData,
      [field]: value
    });
  };
  
  const handleAddDialog = () => {
    if (!newQuestion || !newAnswer) {
      toast({
        title: "Missing information",
        description: "Please provide both a question and an answer.",
        variant: "destructive"
      });
      return;
    }
    
    setAssistantData({
      ...assistantData,
      exampleDialogs: [...assistantData.exampleDialogs, { question: newQuestion, answer: newAnswer }]
    });
    
    setNewQuestion('');
    setNewAnswer('');
    
    toast({
      title: "Dialog added",
      description: "Your example dialog has been added successfully."
    });
  };
  
  const handleRemoveDialog = (index: number) => {
    const updatedDialogs = [...assistantData.exampleDialogs];
    updatedDialogs.splice(index, 1);
    
    setAssistantData({
      ...assistantData,
      exampleDialogs: updatedDialogs
    });
  };
  
  const handleVoiceSelect = (voiceName: string) => {
    // Find the voice ID from the name
    const selectedVoice = AVAILABLE_VOICES.find(v => v.name === voiceName);
    
    setAssistantData({
      ...assistantData,
      voice: voiceName,
      voiceId: selectedVoice?.id || VOICE_SETTINGS.PTBR_FEMALE.id
    });
  };
  
  const handleTransferToVapi = async () => {
    if (!assistantData.name || !assistantData.description || !assistantData.instructions) {
      toast({
        title: "Missing information",
        description: "Please fill out all required fields (name, description, and instructions).",
        variant: "destructive"
      });
      return;
    }
    
    setIsTransferring(true);

    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const mockAssistantId = `assistant_${Date.now()}`;
      setVapiAssistantId(mockAssistantId);
      
      localStorage.setItem('selected_assistant', JSON.stringify({
        id: mockAssistantId,
        name: assistantData.name,
        voice: assistantData.voice,
        voice_id: assistantData.voiceId,
        first_message: "Olá {nome}, como posso ajudar?", // Adding default first_message
        instructions: assistantData.instructions
      }));
      
      setTransferComplete(true);
      
      toast({
        title: "Assistant created",
        description: "Your virtual assistant has been saved and will be used for your campaigns."
      });
    } catch (error) {
      console.error('Error creating assistant:', error);
      toast({
        title: "Creation failed",
        description: "There was an error creating your assistant. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsTransferring(false);
    }
  };
  
  const handleSendFirstMessage = async () => {
    setIsSendingFirstMessage(true);
    setFirstMessageSent(false);
    
    try {
      const result = await webhookService.sendFirstMessageToWebhook(vapiAssistantId);
      
      if (result.success) {
        setFirstMessageSent(true);
        toast({
          title: "Mensagem enviada",
          description: "First message enviada com sucesso para o webhook"
        });
      } else {
        toast({
          title: "Erro ao enviar mensagem",
          description: result.message || "Falha ao enviar first message",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Erro ao enviar first message:', error);
      toast({
        title: "Erro",
        description: `Falha ao enviar first message: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
        variant: "destructive"
      });
    } finally {
      setIsSendingFirstMessage(false);
    }
  };
  
  return (
    <div className="container mx-auto p-4 max-w-5xl">
      <header className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">Configuração do Assistente Virtual</h1>
        <p className="text-gray-500">Configure e transfira seu assistente para o Vapi</p>
      </header>
      
      <Tabs defaultValue="basic" className="mb-8" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-3 max-w-md mx-auto">
          <TabsTrigger value="basic">Informações Básicas</TabsTrigger>
          <TabsTrigger value="dialogs">Exemplos de Diálogo</TabsTrigger>
          <TabsTrigger value="transfer">Transferir para Vapi</TabsTrigger>
        </TabsList>
        
        <TabsContent value="basic">
          <Card>
            <CardHeader>
              <CardTitle>Informações Básicas do Assistente</CardTitle>
              <CardDescription>Defina os detalhes principais do seu assistente virtual</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome do Assistente</Label>
                <Input 
                  id="name"
                  placeholder="Ex: Assistente de Vendas" 
                  value={assistantData.name} 
                  onChange={(e) => handleInputChange('name', e.target.value)}
                />
                <p className="text-sm text-gray-500">Como seu assistente será identificado</p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Input 
                  id="description"
                  placeholder="Ex: Assistente especializado em vendas e suporte" 
                  value={assistantData.description} 
                  onChange={(e) => handleInputChange('description', e.target.value)}
                />
                <p className="text-sm text-gray-500">Uma breve descrição sobre o propósito do assistente</p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="instructions">Instruções</Label>
                <Textarea 
                  id="instructions"
                  placeholder="Ex: Você é um assistente de vendas amigável para nossa empresa..." 
                  value={assistantData.instructions} 
                  onChange={(e) => handleInputChange('instructions', e.target.value)}
                  className="min-h-32"
                />
                <p className="text-sm text-gray-500">Defina como o assistente deve se comportar e responder</p>
              </div>
              
              <div className="space-y-2">
                <Label>Seleção de Voz</Label>
                <div className="grid grid-cols-2 md:grid-cols-2 gap-3">
                  {AVAILABLE_VOICES.map((voice) => (
                    <div 
                      key={voice.id} 
                      className={`border rounded-lg p-3 text-center hover:border-primary/50 cursor-pointer transition-colors ${assistantData.voice === voice.name ? 'border-primary bg-primary/5' : ''}`}
                      onClick={() => handleVoiceSelect(voice.name)}
                    >
                      <div className="text-sm font-medium">{voice.name}</div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" onClick={() => setActiveTab('dialogs')}>
                Cancelar
              </Button>
              <Button onClick={() => setActiveTab('dialogs')}>
                Próximo: Exemplos de Diálogo
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="dialogs">
          <Card>
            <CardHeader>
              <CardTitle>Exemplos de Diálogo</CardTitle>
              <CardDescription>Forneça exemplos de perguntas e respostas para treinar seu assistente</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4">
                {assistantData.exampleDialogs.map((dialog, index) => (
                  <div key={index} className="rounded-lg border p-4">
                    <div className="mb-2">
                      <Label className="text-sm font-medium">Pergunta:</Label>
                      <div className="text-gray-700 mt-1">{dialog.question}</div>
                    </div>
                    <div className="mb-3">
                      <Label className="text-sm font-medium">Resposta:</Label>
                      <div className="text-gray-700 mt-1">{dialog.answer}</div>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      onClick={() => handleRemoveDialog(index)}
                    >
                      Remover
                    </Button>
                  </div>
                ))}
              </div>
              
              <div className="border rounded-lg p-4 space-y-4">
                <h3 className="font-medium">Adicionar Novo Exemplo</h3>
                <div className="space-y-2">
                  <Label htmlFor="newQuestion">Pergunta</Label>
                  <Input 
                    id="newQuestion"
                    placeholder="Ex: Quais são seus horários de atendimento?" 
                    value={newQuestion} 
                    onChange={(e) => setNewQuestion(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newAnswer">Resposta</Label>
                  <Textarea 
                    id="newAnswer"
                    placeholder="Ex: Nosso horário de atendimento é das 9h às 18h..." 
                    value={newAnswer} 
                    onChange={(e) => setNewAnswer(e.target.value)}
                  />
                </div>
                <Button onClick={handleAddDialog}>
                  Adicionar Exemplo
                </Button>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" onClick={() => setActiveTab('basic')}>
                Voltar
              </Button>
              <Button onClick={() => setActiveTab('transfer')}>
                Próximo: Transferir para Vapi
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="transfer">
          <Card>
            <CardHeader>
              <CardTitle>Transferir para Vapi</CardTitle>
              <CardDescription>Envie seu assistente configurado para o Vapi para uso em campanhas</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-gray-50 rounded-lg p-4 border">
                <h3 className="font-medium mb-2 flex items-center">
                  <Brain className="mr-2 h-5 w-5 text-primary" />
                  Resumo do Assistente
                </h3>
                <dl className="grid gap-2">
                  <div className="grid grid-cols-3 gap-1">
                    <dt className="text-gray-500 text-sm">Nome:</dt>
                    <dd className="text-gray-900 col-span-2">{assistantData.name || 'Não definido'}</dd>
                  </div>
                  <div className="grid grid-cols-3 gap-1">
                    <dt className="text-gray-500 text-sm">Descrição:</dt>
                    <dd className="text-gray-900 col-span-2">{assistantData.description || 'Não definido'}</dd>
                  </div>
                  <div className="grid grid-cols-3 gap-1">
                    <dt className="text-gray-500 text-sm">Voz:</dt>
                    <dd className="text-gray-900 col-span-2">{assistantData.voice}</dd>
                  </div>
                  <div className="grid grid-cols-3 gap-1">
                    <dt className="text-gray-500 text-sm">Exemplos de Diálogo:</dt>
                    <dd className="text-gray-900 col-span-2">{assistantData.exampleDialogs.length}</dd>
                  </div>
                </dl>
              </div>
              
              {transferComplete ? (
                <div className="text-center space-y-4">
                  <div className="inline-flex items-center justify-center rounded-full bg-green-100 p-2">
                    <Check className="h-6 w-6 text-green-600" />
                  </div>
                  <h3 className="font-medium text-lg">Assistente Criado com Sucesso!</h3>
                  <p className="text-gray-500">
                    Seu assistente foi configurado e está pronto para uso. ID: {vapiAssistantId}
                  </p>
                  
                  <div className="border rounded-lg p-4 mt-6">
                    <h4 className="font-medium mb-2">Testar First Message</h4>
                    <p className="text-sm text-gray-500 mb-4">
                      Envie a first message configurada para o webhook para testar o funcionamento
                    </p>
                    
                    <Button 
                      onClick={handleSendFirstMessage} 
                      disabled={isSendingFirstMessage}
                      className="w-full"
                    >
                      {isSendingFirstMessage ? (
                        <span className="flex items-center">
                          <span className="animate-spin mr-2">⏳</span> Enviando...
                        </span>
                      ) : (
                        <span className="flex items-center">
                          <Send className="mr-2 h-4 w-4" /> 
                          {firstMessageSent ? "Enviar Novamente" : "Enviar First Message"}
                        </span>
                      )}
                    </Button>
                    
                    {firstMessageSent && (
                      <div className="mt-3 text-sm text-green-600 flex items-center justify-center">
                        <Check className="h-4 w-4 mr-1" />
                        Mensagem enviada com sucesso!
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center space-y-4">
                  <Button 
                    onClick={handleTransferToVapi} 
                    disabled={isTransferring} 
                    size="lg"
                    className="min-w-40"
                  >
                    {isTransferring ? (
                      <span className="flex items-center">
                        <span className="animate-spin mr-2">⏳</span> Transferindo...
                      </span>
                    ) : (
                      <span className="flex items-center">
                        <Upload className="mr-2 h-4 w-4" /> Enviar para Vapi
                      </span>
                    )}
                  </Button>
                  <p className="text-xs text-gray-500">
                    Ao transferir, você confirma que o assistente está configurado conforme necessário
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default VapiAssistantTransfer;
