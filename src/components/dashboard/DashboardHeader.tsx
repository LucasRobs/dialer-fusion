
import React from 'react';
import { Link } from 'react-router-dom';
import { Users, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DashboardHeaderProps {
  userName?: string;
}

const DashboardHeader: React.FC<DashboardHeaderProps> = ({ userName = 'User' }) => {
  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
      <div>
        <h1 className="text-3xl font-bold">Welcome back, {userName}</h1>
        <p className="text-foreground/70">Here's what's happening with your campaigns today.</p>
      </div>
      <div className="mt-4 md:mt-0 flex gap-3">
        <Link to="/clients">
          <Button variant="outline" className="flex items-center gap-2">
            <Users size={16} />
            <span>Add Clients</span>
          </Button>
        </Link>
        <Link to="/campaigns">
          <Button className="flex items-center gap-2">
            <Phone size={16} />
            <span>New Campaign</span>
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default DashboardHeader;
