
import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight, Phone, BarChart3, Users } from 'lucide-react';

const Hero = () => {
  return (
    <div className="relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-radial from-secondary/5 to-transparent -z-10" />
      
      <div className="container mx-auto px-4 py-28 md:py-40">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center justify-center px-3 py-1 mb-6 text-xs font-semibold text-secondary bg-secondary/10 rounded-full">
            Automate your calls with AI
          </div>
          
          <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
            Transform Your <span className="text-secondary">Outreach</span> With Intelligent Calling
          </h1>
          
          <p className="text-lg md:text-xl text-foreground/80 mb-8">
            Manage and automate mass call campaigns with AI-powered conversations. Reach more clients, track results, and scale your communication strategy.
          </p>
          
          <div className="flex flex-col sm:flex-row justify-center gap-4 mb-16">
            <Link to="/register">
              <Button size="lg" className="w-full sm:w-auto group">
                Get Started
                <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <Link to="/features">
              <Button variant="outline" size="lg" className="w-full sm:w-auto">
                Learn More
              </Button>
            </Link>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="glass p-6 rounded-xl card-hover">
              <div className="bg-secondary/10 p-3 rounded-lg w-fit mx-auto mb-4">
                <Phone className="h-6 w-6 text-secondary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">AI-Powered Calls</h3>
              <p className="text-foreground/70">Leverage intelligent conversations to engage your clients effectively</p>
            </div>
            
            <div className="glass p-6 rounded-xl card-hover">
              <div className="bg-secondary/10 p-3 rounded-lg w-fit mx-auto mb-4">
                <Users className="h-6 w-6 text-secondary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Client Management</h3>
              <p className="text-foreground/70">Keep track of your client base and organize campaigns efficiently</p>
            </div>
            
            <div className="glass p-6 rounded-xl card-hover">
              <div className="bg-secondary/10 p-3 rounded-lg w-fit mx-auto mb-4">
                <BarChart3 className="h-6 w-6 text-secondary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Detailed Analytics</h3>
              <p className="text-foreground/70">Gain insights with comprehensive campaign performance metrics</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Hero;
