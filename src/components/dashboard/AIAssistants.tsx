
import React from 'react';
import { Link } from 'react-router-dom';
import { Brain, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

interface AIAssistant {
  id: string;
  name: string;
  status: string;
}

interface AIAssistantsProps {
  assistants: AIAssistant[];
  selectedAssistant: AIAssistant | null;
  isLoading: boolean;
}

const AIAssistants: React.FC<AIAssistantsProps> = ({ 
  assistants, 
  selectedAssistant, 
  isLoading 
}) => {
  const readyAssistants = assistants?.filter(asst => asst.status !== 'pending') || [];
  
  return (
    <div className="mb-8">
      <Card className="card-hover">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-medium flex items-center">
            <Brain className="h-5 w-5 mr-2 text-secondary" />
            Assistentes IA
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-24" />
              <Skeleton className="h-4 w-32" />
              <div className="flex justify-end">
                <Skeleton className="h-7 w-16" />
              </div>
              <Skeleton className="h-10 w-full mt-4" />
            </div>
          ) : (
            <>
              <div className="flex justify-between items-end">
                <div>
                  <div className="text-3xl font-bold">{readyAssistants.length}</div>
                  <p className="text-sm text-foreground/70">Total de Assistentes</p>
                </div>
                <div className="text-right">
                  <div className="text-xl font-semibold text-secondary">
                    {selectedAssistant?.name || 'Nenhum selecionado'}
                  </div>
                  <p className="text-sm text-foreground/70">Assistente Ativo</p>
                </div>
              </div>
              <Link to="/vapi-assistant">
                <Button variant="ghost" className="w-full mt-4 text-sm">
                  Gerenciar Assistentes
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AIAssistants;
