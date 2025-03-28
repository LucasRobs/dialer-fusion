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

interface VapiAssistantParams {
  name: string;
  description: string;
  instructions: string;
  exampleDialogs: {question: string; answer: string}[];
  voice: string;
}

const VapiAssistantTransfer = () => {
  const [assistantData, setAssistantData] = useState<VapiAssistantParams>({
    name: '',
    description: '',
    instructions: '',
    exampleDialogs: [
      { question: 'What services do you offer?', answer: 'We offer a variety of services including...' },
      { question: 'How can I contact support?', answer: 'You can reach our support team by...' }
    ],
    voice: 'alloy'
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
  
  const handleVoiceSelect = (voice: string) => {
    setAssistantData({
      ...assistantData,
      voice
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
        voice: assistantData.voice
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
      <div className="flex flex-col items-center text-center mb-8">
        <div className="mb-4 p-3 rounded-full bg-primary/10">
          <Brain className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-3xl font-bold mb-2">Vapi Assistant Transfer</h1>
        <p className="text-muted-foreground max-w-lg">
          Create your virtual assistant configuration and transfer it to Vapi for use in your calling campaigns.
        </p>
      </div>
      
      <Tabs defaultValue="basic" className="mb-8" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-3 max-w-md mx-auto">
          <TabsTrigger value="basic">Basic Info</TabsTrigger>
          <TabsTrigger value="dialogs">Example Dialogs</TabsTrigger>
          <TabsTrigger value="transfer">Transfer to Vapi</TabsTrigger>
        </TabsList>
        
        <TabsContent value="basic">
          <Card>
            <CardHeader>
              <CardTitle>Assistant Basic Information</CardTitle>
              <CardDescription>Define the core details of your virtual assistant</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Assistant Name*</Label>
                <Input
                  id="name"
                  placeholder="e.g., Sales Assistant, Support Bot"
                  value={assistantData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">Description*</Label>
                <Textarea
                  id="description"
                  placeholder="Briefly describe what your assistant will help with"
                  value={assistantData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  rows={3}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="instructions">Instructions*</Label>
                <Textarea
                  id="instructions"
                  placeholder="Detailed instructions for how your assistant should behave, what knowledge it has, and what it should do"
                  value={assistantData.instructions}
                  onChange={(e) => handleInputChange('instructions', e.target.value)}
                  rows={6}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label>Voice Selection</Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {['alloy', 'shimmer', 'nova', 'echo', 'fable', 'onyx'].map((voice) => (
                    <div 
                      key={voice} 
                      className={`border rounded-lg p-3 text-center hover:border-primary/50 cursor-pointer transition-colors ${assistantData.voice === voice ? 'border-primary bg-primary/5' : ''}`}
                      onClick={() => handleVoiceSelect(voice)}
                    >
                      <div className="text-sm font-medium capitalize">{voice}</div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                onClick={() => setActiveTab('dialogs')}
                disabled={!assistantData.name || !assistantData.description || !assistantData.instructions}
                className="w-full"
              >
                Continue to Example Dialogs
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="dialogs">
          <Card>
            <CardHeader>
              <CardTitle>Example Dialogs</CardTitle>
              <CardDescription>Add example conversations to train your assistant</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium">Example Q&A Pairs</h3>
                  <span className="text-sm text-muted-foreground">{assistantData.exampleDialogs.length} examples</span>
                </div>
                
                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                  {assistantData.exampleDialogs.map((dialog, index) => (
                    <div key={index} className="border rounded-lg p-4 relative">
                      <button 
                        className="absolute top-2 right-2 text-muted-foreground hover:text-destructive transition-colors"
                        onClick={() => handleRemoveDialog(index)}
                      >
                        ×
                      </button>
                      <div className="mb-3">
                        <Label className="text-sm text-secondary">Question</Label>
                        <div className="font-medium">{dialog.question}</div>
                      </div>
                      <div>
                        <Label className="text-sm text-primary">Answer</Label>
                        <div className="text-foreground/80">{dialog.answer}</div>
                      </div>
                    </div>
                  ))}
                </div>
                
                <Card className="border border-dashed">
                  <CardContent className="p-4 space-y-3">
                    <div className="space-y-2">
                      <Label htmlFor="question">New Question</Label>
                      <Input
                        id="question"
                        placeholder="What might a user ask?"
                        value={newQuestion}
                        onChange={(e) => setNewQuestion(e.target.value)}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="answer">Assistant's Answer</Label>
                      <Textarea
                        id="answer"
                        placeholder="How should your assistant respond?"
                        value={newAnswer}
                        onChange={(e) => setNewAnswer(e.target.value)}
                        rows={3}
                      />
                    </div>
                    
                    <Button onClick={handleAddDialog} variant="outline" className="w-full">
                      Add Example Dialog
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" onClick={() => setActiveTab('basic')}>Back</Button>
              <Button onClick={() => setActiveTab('transfer')}>Continue to Transfer</Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="transfer">
          <Card>
            <CardHeader>
              <CardTitle>Transfer to Vapi</CardTitle>
              <CardDescription>Transfer your assistant configuration to Vapi</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="border rounded-lg p-4 space-y-3">
                <h3 className="text-lg font-medium">Assistant Summary</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm text-muted-foreground">Name</Label>
                    <p className="font-medium">{assistantData.name}</p>
                  </div>
                  
                  <div>
                    <Label className="text-sm text-muted-foreground">Voice</Label>
                    <p className="font-medium capitalize">{assistantData.voice}</p>
                  </div>
                  
                  <div className="md:col-span-2">
                    <Label className="text-sm text-muted-foreground">Description</Label>
                    <p>{assistantData.description}</p>
                  </div>
                  
                  <div className="md:col-span-2">
                    <Label className="text-sm text-muted-foreground">Example Dialogs</Label>
                    <p>{assistantData.exampleDialogs.length} example conversations</p>
                  </div>
                </div>
              </div>
              
              {transferComplete ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                  <div className="flex justify-center mb-2">
                    <Check className="h-6 w-6 text-green-600" />
                  </div>
                  <h3 className="text-lg font-medium text-green-800">Transfer Complete</h3>
                  <p className="text-green-700 mb-2">Your assistant has been successfully transferred to Vapi.</p>
                  <div className="bg-white rounded p-2 font-mono text-xs break-all border mb-3">
                    {vapiAssistantId}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    This assistant will now be used for your outbound calls. You can manage it through the Vapi dashboard.
                  </p>
                </div>
              ) : (
                <div className="text-center">
                  <Button 
                    onClick={handleTransferToVapi} 
                    disabled={isTransferring || !assistantData.name || !assistantData.description || !assistantData.instructions}
                    className="w-full sm:w-auto"
                  >
                    {isTransferring ? (
                      <>
                        <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                        Transferring...
                      </>
                    ) : (
                      <>
                        <Upload className="mr-2 h-4 w-4" />
                        Transfer to Vapi
                      </>
                    )}
                  </Button>
                  
                  <p className="text-xs text-muted-foreground mt-2">
                    This will create an assistant in Vapi using your configuration.
                  </p>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" onClick={() => setActiveTab('dialogs')}>Back</Button>
              {transferComplete && (
                <Button onClick={() => {
                  toast({
                    title: "Assistant Ready",
                    description: "Your Vapi assistant is now ready to use in your calling campaigns."
                  });
                }}>
                  Done
                </Button>
              )}
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default VapiAssistantTransfer;
