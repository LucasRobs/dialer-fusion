
import React, { useState } from 'react';
import { 
  BarChart as BarChartIcon, 
  PieChart as PieChartIcon, 
  Clock, 
  Phone,
  Calendar,
  Download,
  ArrowDownWideNarrow,
  CheckCircle2,
  XCircle,
  PhoneOff,
  AlertCircle,
  PhoneIncoming
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts';

const Analytics = () => {
  const [timeRange, setTimeRange] = useState('7d');
  const [campaign, setCampaign] = useState('all');
  
  // Dummy data for different charts
  const callData = [
    { day: 'Mon', completed: 65, dropped: 12 },
    { day: 'Tue', completed: 78, dropped: 15 },
    { day: 'Wed', completed: 95, dropped: 8 },
    { day: 'Thu', completed: 83, dropped: 13 },
    { day: 'Fri', completed: 105, dropped: 10 },
    { day: 'Sat', completed: 45, dropped: 5 },
    { day: 'Sun', completed: 30, dropped: 4 },
  ];
  
  const callOutcomeData = [
    { name: 'Answered', value: 650, color: '#00af6b' },
    { name: 'Voicemail', value: 220, color: '#FFB020' },
    { name: 'No Answer', value: 180, color: '#7F7F7F' },
    { name: 'Rejected', value: 150, color: '#F04438' },
  ];
  
  const durationData = [
    { range: '0-30s', calls: 120 },
    { range: '30s-1m', calls: 180 },
    { range: '1-2m', calls: 280 },
    { range: '2-5m', calls: 210 },
    { range: '5m+', calls: 85 },
  ];
  
  const conversionData = [
    { name: 'Interested', value: 380, color: '#00af6b' },
    { name: 'Not Interested', value: 210, color: '#F04438' },
    { name: 'Follow-up', value: 310, color: '#0EA5E9' },
    { name: 'No Decision', value: 150, color: '#7F7F7F' },
  ];
  
  // Dummy campaigns for filter
  const campaigns = [
    { id: 'all', name: 'All Campaigns' },
    { id: 'summer', name: 'Summer Promotion 2023' },
    { id: 'feedback', name: 'Customer Feedback' },
    { id: 'appointments', name: 'Appointment Reminder' },
  ];
  
  // Calculate summary statistics
  const totalCalls = 1200;
  const answeredCalls = 650;
  const avgDuration = '2:15';
  const conversionRate = '32%';
  
  return (
    <div className="container mx-auto p-4 max-w-7xl">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Campaign Analytics</h1>
          <p className="text-muted-foreground">Track the performance of your call campaigns</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2 mt-4 md:mt-0">
          <Select value={campaign} onValueChange={setCampaign}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select campaign" />
            </SelectTrigger>
            <SelectContent>
              {campaigns.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Time range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          
          <Button variant="outline" size="sm" className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            <span>Export</span>
          </Button>
        </div>
      </div>
      
      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card className="card-hover">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Calls</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center">
              <div className="text-2xl font-bold">{totalCalls}</div>
              <div className="p-2 rounded-full bg-primary/10">
                <Phone className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="card-hover">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Answer Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center">
              <div className="text-2xl font-bold">{Math.round((answeredCalls / totalCalls) * 100)}%</div>
              <div className="p-2 rounded-full bg-secondary/10">
                <PhoneIncoming className="h-5 w-5 text-secondary" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="card-hover">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg. Call Duration</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center">
              <div className="text-2xl font-bold">{avgDuration}</div>
              <div className="p-2 rounded-full bg-primary/10">
                <Clock className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="card-hover">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Conversion Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center">
              <div className="text-2xl font-bold">{conversionRate}</div>
              <div className="p-2 rounded-full bg-secondary/10">
                <CheckCircle2 className="h-5 w-5 text-secondary" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Call Volume Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <BarChartIcon className="h-5 w-5 text-secondary" />
                  <span>Call Volume by Day</span>
                </CardTitle>
                <CardDescription>Number of completed vs. dropped calls</CardDescription>
              </div>
              <Button variant="ghost" size="icon">
                <ArrowDownWideNarrow className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={callData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                  <XAxis dataKey="day" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="completed" name="Completed" fill="#00af6b" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="dropped" name="Dropped" fill="#F04438" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        
        {/* Call Outcome Chart */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <PieChartIcon className="h-5 w-5 text-secondary" />
                  <span>Call Outcomes</span>
                </CardTitle>
                <CardDescription>Distribution of call results</CardDescription>
              </div>
              <Button variant="ghost" size="icon">
                <ArrowDownWideNarrow className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={callOutcomeData}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={90}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {callOutcomeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Legend />
                  <Tooltip formatter={(value) => [`${value} calls`, 'Count']} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Call Duration and Conversion Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-secondary" />
                  <span>Call Duration Distribution</span>
                </CardTitle>
                <CardDescription>Length of completed calls</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={durationData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                  <XAxis dataKey="range" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="calls" name="Number of Calls" fill="#33334F" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <PieChartIcon className="h-5 w-5 text-secondary" />
                  <span>Conversion Results</span>
                </CardTitle>
                <CardDescription>Call outcome classifications</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={conversionData}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={90}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {conversionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Legend />
                  <Tooltip formatter={(value) => [`${value} calls`, 'Count']} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Performance Metrics */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChartIcon className="h-5 w-5 text-secondary" />
            <span>Campaign Performance Metrics</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="border rounded-lg p-4 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Answered Calls</span>
                <CheckCircle2 className="h-5 w-5 text-secondary" />
              </div>
              <div className="text-2xl font-semibold">{answeredCalls}</div>
              <div className="text-sm text-muted-foreground">{Math.round((answeredCalls / totalCalls) * 100)}% of total</div>
            </div>
            
            <div className="border rounded-lg p-4 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Unanswered Calls</span>
                <PhoneOff className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="text-2xl font-semibold">{totalCalls - answeredCalls}</div>
              <div className="text-sm text-muted-foreground">{Math.round(((totalCalls - answeredCalls) / totalCalls) * 100)}% of total</div>
            </div>
            
            <div className="border rounded-lg p-4 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Positive Outcomes</span>
                <CheckCircle2 className="h-5 w-5 text-secondary" />
              </div>
              <div className="text-2xl font-semibold">380</div>
              <div className="text-sm text-muted-foreground">58% of answered calls</div>
            </div>
            
            <div className="border rounded-lg p-4 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Negative Outcomes</span>
                <XCircle className="h-5 w-5 text-destructive" />
              </div>
              <div className="text-2xl font-semibold">210</div>
              <div className="text-sm text-muted-foreground">32% of answered calls</div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-secondary" />
            <span>Insights & Recommendations</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold mb-2">Best Calling Times</h3>
              <p className="text-sm text-muted-foreground mb-2">
                Based on your data, the optimal times to reach your clients are:
              </p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-secondary" />
                  <span>Tuesdays 10am - 12pm</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-secondary" />
                  <span>Wednesdays 2pm - 4pm</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-secondary" />
                  <span>Thursdays 1pm - 3pm</span>
                </div>
              </div>
            </div>
            
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold mb-2">Performance Insights</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-secondary shrink-0 mt-0.5" />
                  <span>Your average call duration of 2:15 is optimal. Calls between 2-5 minutes show the highest conversion rate.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-secondary shrink-0 mt-0.5" />
                  <span>Wednesday has the highest call volume and success rate. Consider allocating more resources to this day.</span>
                </li>
                <li className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                  <span>Weekend call volume is low with higher drop rates. Consider rescheduling these calls to weekdays.</span>
                </li>
              </ul>
            </div>
            
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold mb-2">Suggested Actions</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-start gap-2">
                  <div className="p-1.5 rounded-full bg-secondary/10 shrink-0">
                    <Calendar className="h-4 w-4 text-secondary" />
                  </div>
                  <div>
                    <h4 className="text-sm font-medium">Optimize Call Schedule</h4>
                    <p className="text-xs text-muted-foreground">Adjust your campaign schedule to focus on high-performance time slots.</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <div className="p-1.5 rounded-full bg-secondary/10 shrink-0">
                    <MessageSquare className="h-4 w-4 text-secondary" />
                  </div>
                  <div>
                    <h4 className="text-sm font-medium">Refine AI Training</h4>
                    <p className="text-xs text-muted-foreground">Update your AI training with common objections from the negative outcomes.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Analytics;
