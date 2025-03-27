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
import { 
  Brain, 
  Save, 
  PlayCircle, 
  Mic, 
  MessageSquare, 
  PlusCircle,
  CheckCircle2,
  X,
  Loader2,
  Phone
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { webhookService } from '@/services/webhookService';

interface VapiAssistant {
  id: string;
  name: string;
  description: string;
  voice: string;
}

const AITraining = () => {
  const [trainingName, setTrainingName] = useState('');
  const [trainingDescription, setTrainingDescription] = useState('');
  const [objective, setObjective] = useState('');
  const [script, setScript] = useState('');
  const [responses, setResponses] = useState<{ question: string; answer: string }[]>([
    { question: 'What are your pricing options?', answer: 'We offer three tiers: Basic at $29/month, Professional at $59/month, and Enterprise at $99/month. Each includes progressively more features and support options.' },
    { question: 'How do I cancel my subscription?', answer: 'You can cancel anytime by logging into your account, going to Settings > Subscription, and clicking "Cancel Subscription". Your service will continue until the end of your billing period.' },
  ]);
  const [newQuestion, setNewQuestion] = useState('');
  const [newAnswer, setNewAnswer] = useState('');
  const [isTraining, setIsTraining] = useState(false);
  const [trainingProgress, setTrainingProgress] = useState(0);
  const [activeTab, setActiveTab] = useState('basic');
  const [selectedVoice, setSelectedVoice] = useState('Female 1');
  const [createdAssistant, setCreatedAssistant] = useState<VapiAssistant | null>(null);
  
  const { toast } = useToast();
  
  const handleSaveProfile = () => {
    if (!trainingName || !trainingDescription) {
      toast({
        title: "Missing information",
        description: "Please provide a name and description for your AI profile.",
        variant: "destructive"
      });
      return;
    }
    
    toast({
      title: "Profile saved",
      description: "Your AI assistant profile has been saved successfully."
    });
  };
  
  const handleAddResponse = () => {
    if (!newQuestion || !newAnswer) {
      toast({
        title: "Missing information",
        description: "Please provide both a question and an answer.",
        variant: "destructive"
      });
      return;
    }
    
    setResponses([...responses, { question: newQuestion, answer: newAnswer }]);
    setNewQuestion('');
    setNewAnswer('');
    
    toast({
      title: "Response added",
      description: "Your Q&A pair has been added to the training data."
    });
  };
  
  const handleRemoveResponse = (index: number) => {
    const newResponses = [...responses];
    newResponses.splice(index, 1);
    setResponses(newResponses);
  };
  
  const handleStartTraining = async () => {
    setIsTraining(true);
    setTrainingProgress(0);
    
    toast({
      title: "Training started",
      description: "Your AI assistant is now being trained with your data."
    });
    
    const assistantId = await simulateVapiAssistantCreation();
    
    const interval = setInterval(() => {
      setTrainingProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsTraining(false);
          
          const assistantData: VapiAssistant = {
            id: assistantId,
            name: trainingName,
            description: trainingDescription,
            voice: selectedVoice
          };
          
          localStorage.setItem('vapi_assistant', JSON.stringify(assistantData));
          setCreatedAssistant(assistantData);
          
          toast({
            title: "Training complete",
            description: "Your AI assistant has been successfully trained and is ready to use in calls."
          });
          
          return 100;
        }
        return prev + 5;
      });
    }, 300);
  };
  
  const simulateVapiAssistantCreation = async (): Promise<string> => {
    return trainingName ? `assistant_${Date.now()}` : "01646bac-c486-455b-bbc4-a2bc5a1da47c";
  };
  
  const handleTestVoice = () => {
    toast({
      title: "Voice test",
      description: "This would play a sample of your AI assistant's voice in a real application."
    });
  };
  
  const handleTestCall = async () => {
    if (!createdAssistant) {
      toast({
        title: "No assistant created",
        description: "You need to create and train an assistant first before testing a call.",
        variant: "destructive"
      });
      return;
    }
    
    try {
      const testData = {
        action: 'test_call',
        client_name: "Cliente Teste",
        client_phone: "+5511999999999",
        additional_data: {
          source: 'manual_test',
          user_interface: 'AITraining',
          vapi_caller_id: "97141b30-c5bc-4234-babb-d38b79452e2a",
          vapi_assistant_id: createdAssistant.id
        }
      };
      
      const result = await webhookService.triggerCallWebhook(testData);
      
      if (result.success) {
        toast({
          title: "Test call initiated",
          description: `A test call is being made using your "${createdAssistant.name}" assistant.`,
        });
      } else {
        toast({
          title: "Call test failed",
          description: "There was an error initiating the test call.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error testing call:', error);
      toast({
        title: "Call test error",
        description: "An unexpected error occurred while trying to make a test call.",
        variant: "destructive"
      });
    }
  };
  
  return (
    <div className="container mx-auto p-4 max-w-5xl">
      <div className="flex flex-col items-center text-center mb-8">
        <div className="mb-4 p-3 rounded-full bg-secondary/10">
          <Brain className="h-8 w-8 text-secondary" />
        </div>
        <h1 className="text-3xl font-bold mb-2">AI Assistant Training</h1>
        <p className="text-muted-foreground max-w-lg">
          Customize your AI assistant to match your business needs, voice, and responses to effectively engage with your clients.
        </p>
      </div>
      
      <Tabs defaultValue="basic" className="mb-8" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-3 max-w-md mx-auto">
          <TabsTrigger value="basic">Basic Setup</TabsTrigger>
          <TabsTrigger value="responses">Responses</TabsTrigger>
          <TabsTrigger value="training">Training</TabsTrigger>
        </TabsList>
        
        <TabsContent value="basic">
          <Card>
            <CardHeader>
              <CardTitle>Assistant Profile</CardTitle>
              <CardDescription>Define the basic information about your AI assistant</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Assistant Name</Label>
                <Input
                  id="name"
                  placeholder="e.g., Sales Assistant, Support Bot"
                  value={trainingName}
                  onChange={(e) => setTrainingName(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Briefly describe what your assistant will help with"
                  value={trainingDescription}
                  onChange={(e) => setTrainingDescription(e.target.value)}
                  rows={3}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="objective">Main Objective</Label>
                <Textarea
                  id="objective"
                  placeholder="What is the primary goal of your calls? (e.g., schedule appointments, collect feedback)"
                  value={objective}
                  onChange={(e) => setObjective(e.target.value)}
                  rows={3}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="voice">Voice Selection</Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {['Female 1', 'Female 2', 'Male 1', 'Male 2'].map((voice) => (
                    <div 
                      key={voice} 
                      className={`border rounded-lg p-3 text-center hover:border-secondary/50 cursor-pointer transition-colors ${selectedVoice === voice ? 'border-secondary bg-secondary/5' : ''}`}
                      onClick={() => setSelectedVoice(voice)}
                    >
                      <div className="flex justify-center mb-2">
                        <Mic className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <div className="text-sm font-medium">{voice}</div>
                      <Button variant="ghost" size="sm" className="mt-2 w-full" onClick={handleTestVoice}>
                        <PlayCircle className="h-3 w-3 mr-1" />
                        Test
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" onClick={() => setActiveTab('responses')}>
                Skip
              </Button>
              <Button onClick={() => { handleSaveProfile(); setActiveTab('responses'); }}>
                <Save className="h-4 w-4 mr-2" />
                Save & Continue
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="responses">
          <Card>
            <CardHeader>
              <CardTitle>Training Responses</CardTitle>
              <CardDescription>Teach your AI how to respond to common questions</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="script">Introduction Script</Label>
                <Textarea
                  id="script"
                  placeholder="What should your AI say when the call starts? (e.g., Hello, this is [Name] from [Company]. I'm calling about...)"
                  value={script}
                  onChange={(e) => setScript(e.target.value)}
                  rows={4}
                />
              </div>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium">Q&A Pairs</h3>
                  <span className="text-sm text-muted-foreground">{responses.length} responses</span>
                </div>
                
                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                  {responses.map((response, index) => (
                    <div key={index} className="border rounded-lg p-4 relative">
                      <button 
                        className="absolute top-2 right-2 text-muted-foreground hover:text-destructive transition-colors"
                        onClick={() => handleRemoveResponse(index)}
                      >
                        <X className="h-4 w-4" />
                      </button>
                      <div className="mb-3">
                        <Label className="text-sm text-secondary">Question</Label>
                        <div className="font-medium">{response.question}</div>
                      </div>
                      <div>
                        <Label className="text-sm text-primary">Answer</Label>
                        <div className="text-foreground/80">{response.answer}</div>
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
                        placeholder="What question might a client ask?"
                        value={newQuestion}
                        onChange={(e) => setNewQuestion(e.target.value)}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="answer">Your Answer</Label>
                      <Textarea
                        id="answer"
                        placeholder="How should your AI respond?"
                        value={newAnswer}
                        onChange={(e) => setNewAnswer(e.target.value)}
                        rows={3}
                      />
                    </div>
                    
                    <Button onClick={handleAddResponse} variant="outline" className="w-full">
                      <PlusCircle className="h-4 w-4 mr-2" />
                      Add Response
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" onClick={() => setActiveTab('basic')}>Back</Button>
              <Button onClick={() => setActiveTab('training')}>Continue to Training</Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="training">
          <Card>
            <CardHeader>
              <CardTitle>AI Training Status</CardTitle>
              <CardDescription>
                Train your AI assistant with the information you've provided
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-lg font-medium">
                    <Brain className="h-5 w-5 text-secondary" />
                    <span>Training Data Summary</span>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex justify-between items-center text-sm border-b pb-2">
                      <span className="text-muted-foreground">Assistant Name</span>
                      <span className="font-medium">{trainingName || 'Not specified'}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm border-b pb-2">
                      <span className="text-muted-foreground">Voice Profile</span>
                      <span className="font-medium">{selectedVoice}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm border-b pb-2">
                      <span className="text-muted-foreground">Response Pairs</span>
                      <span className="font-medium">{responses.length}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm border-b pb-2">
                      <span className="text-muted-foreground">Script Length</span>
                      <span className="font-medium">{script ? `${script.length} characters` : 'Not provided'}</span>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-lg font-medium">
                    <MessageSquare className="h-5 w-5 text-secondary" />
                    <span>AI Capabilities</span>
                  </div>
                  
                  <div className="space-y-2">
                    {[
                      { label: 'Natural Conversation', enabled: true },
                      { label: 'Question Handling', enabled: responses.length > 0 },
                      { label: 'Objection Management', enabled: responses.length >= 5 },
                      { label: 'Personalization', enabled: trainingName.length > 0 }
                    ].map((capability, index) => (
                      <div key={index} className="flex items-center gap-2 p-2 rounded border">
                        {capability.enabled ? (
                          <CheckCircle2 className="h-5 w-5 text-secondary" />
                        ) : (
                          <X className="h-5 w-5 text-muted-foreground" />
                        )}
                        <span>{capability.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="rounded-lg border p-4 space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-medium">Training Progress</h3>
                  <span className="text-sm">{trainingProgress}%</span>
                </div>
                
                <Progress value={trainingProgress} className="h-2" />
                
                <div className="text-center">
                  {isTraining ? (
                    <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Training in progress... This may take a few minutes</span>
                    </div>
                  ) : trainingProgress === 100 ? (
                    <div className="flex flex-col items-center gap-4">
                      <div className="flex items-center justify-center gap-2 text-sm text-secondary">
                        <CheckCircle2 className="h-4 w-4" />
                        <span>Training complete! Your AI assistant is ready to use.</span>
                      </div>
                      
                      <Button 
                        onClick={handleTestCall}
                        variant="outline"
                        className="mt-2"
                      >
                        <Phone className="h-4 w-4 mr-2" />
                        Test a Call with this Assistant
                      </Button>
                    </div>
                  ) : (
                    <Button 
                      onClick={handleStartTraining} 
                      disabled={isTraining || responses.length === 0}
                      className="w-full sm:w-auto"
                    >
                      <Brain className="h-4 w-4 mr-2" />
                      Start Training
                    </Button>
                  )}
                </div>
              </div>
              
              {createdAssistant && (
                <div className="rounded-lg border border-green-200 bg-green-50 p-4">
                  <div className="flex items-center gap-2 text-green-700 font-medium">
                    <CheckCircle2 className="h-5 w-5" />
                    <span>Assistant Created Successfully</span>
                  </div>
                  <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">Assistant ID:</span>
                      <code className="bg-white px-2 py-1 rounded border text-xs overflow-hidden text-ellipsis">{createdAssistant.id}</code>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Name:</span> {createdAssistant.name}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    This assistant has been saved and will be used for your outbound calls.
                  </p>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" onClick={() => setActiveTab('responses')}>Back</Button>
              <Button 
                disabled={trainingProgress !== 100}
                onClick={() => {
                  toast({
                    title: "AI Ready for Campaigns",
                    description: "Your trained AI assistant is now available for your calling campaigns."
                  });
                }}
              >
                Finish & Apply to Campaigns
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AITraining;
