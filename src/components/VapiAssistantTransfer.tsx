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
import { Brain, Upload, Check } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { VOICE_SETTINGS } from '@/lib/supabase';

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
        voice_id: assistantData.voiceId
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
  
  return (
    <div className="container mx-auto p-4 max-w-5xl">
      {/* ... keep existing code (header section) */}
      
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
              {/* ... keep existing code (name, description, instructions fields) */}
              
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
            {/* ... keep existing code (footer and buttons) */}
          </Card>
        </TabsContent>
        
        {/* ... keep existing code (dialogs and transfer tabs) */}
      </Tabs>
    </div>
  );
};

export default VapiAssistantTransfer;
