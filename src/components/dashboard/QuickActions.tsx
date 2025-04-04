import React from 'react';
import { Link } from 'react-router-dom';
import { Users, Brain, Zap } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

const QuickActions = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Link to="/clients">
        <Card className="h-full card-hover border-2 border-transparent hover:border-secondary/30">
          <CardContent className="p-6 flex flex-col items-center justify-center text-center">
            <Users className="h-10 w-10 mb-3 text-secondary" />
            <h3 className="font-semibold text-lg mb-1">Manage Clients</h3>
            <p className="text-sm text-foreground/70">Add, edit, or remove clients from your database</p>
          </CardContent>
        </Card>
      </Link>

      <Link to="/training">
        <Card className="h-full card-hover border-2 border-transparent hover:border-secondary/30">
          <CardContent className="p-6 flex flex-col items-center justify-center text-center">
            <Brain className="h-10 w-10 mb-3 text-secondary" />
            <h3 className="font-semibold text-lg mb-1">Train AI Assistant</h3>
            <p className="text-sm text-foreground/70">Customize your AI to match your business needs</p>
          </CardContent>
        </Card>
      </Link>

      <Link to="/campaigns">
        <Card className="h-full card-hover border-2 border-transparent hover:border-secondary/30">
          <CardContent className="p-6 flex flex-col items-center justify-center text-center">
            <Zap className="h-10 w-10 mb-3 text-secondary" />
            <h3 className="font-semibold text-lg mb-1">Start Campaign</h3>
            <p className="text-sm text-foreground/70">Launch a new mass calling campaign</p>
          </CardContent>
        </Card>
      </Link>
    </div>
  );
};

export default QuickActions;
