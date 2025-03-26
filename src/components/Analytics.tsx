import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MessageSquare } from 'lucide-react';

const data = [
  { name: 'Jan', calls: 4000, cost: 2400, },
  { name: 'Feb', calls: 3000, cost: 1398, },
  { name: 'Mar', calls: 2000, cost: 9800, },
  { name: 'Apr', calls: 2780, cost: 3908, },
  { name: 'May', calls: 1890, cost: 4800, },
  { name: 'Jun', calls: 2390, cost: 3800, },
  { name: 'Jul', calls: 3490, cost: 4300, },
  { name: 'Aug', calls: 4000, cost: 2400, },
  { name: 'Sep', calls: 3000, cost: 1398, },
  { name: 'Oct', calls: 2000, cost: 9800, },
  { name: 'Nov', calls: 2780, cost: 3908, },
  { name: 'Dec', calls: 1890, cost: 4800, },
];

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

const RADIAN = Math.PI / 180;
const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index }: any) => {
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central">
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

const Analytics = () => {
  return (
    <div className="container mx-auto p-4 max-w-7xl">
      <h1 className="text-3xl font-bold mb-8">Analytics Dashboard</h1>

      <Tabs defaultValue="overview" className="w-full space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="campaigns">Campaign Performance</TabsTrigger>
          <TabsTrigger value="client-engagement">Client Engagement</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="card-hover">
              <CardHeader>
                <CardTitle className="text-lg font-semibold">Total Calls</CardTitle>
                <CardDescription>Number of calls made this month</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold">3,457</div>
                <span className="text-sm text-muted-foreground">+20% from last month</span>
              </CardContent>
            </Card>

            <Card className="card-hover">
              <CardHeader>
                <CardTitle className="text-lg font-semibold">Average Call Duration</CardTitle>
                <CardDescription>Average length of calls</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold">4:32</div>
                <span className="text-sm text-muted-foreground">-5% from last month</span>
              </CardContent>
            </Card>

            <Card className="card-hover">
              <CardHeader>
                <CardTitle className="text-lg font-semibold">Client Conversion Rate</CardTitle>
                <CardDescription>Percentage of calls resulting in a conversion</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold">15%</div>
                <span className="text-sm text-muted-foreground">+3% from last month</span>
              </CardContent>
            </Card>
          </div>

          <Card className="card-hover">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Monthly Call Performance</CardTitle>
              <CardDescription>A detailed view of calls made each month</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="calls" fill="#8884d8" />
                  <Bar dataKey="cost" fill="#82ca9d" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="campaigns" className="space-y-4">
          <Card className="card-hover">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Campaign Success Rates</CardTitle>
              <CardDescription>Conversion rates for each active campaign</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={renderCustomizedLabel}
                    outerRadius={120}
                    fill="#8884d8"
                    dataKey="calls"
                  >
                    {data.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="client-engagement" className="space-y-4">
          <Card className="card-hover">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Client Interaction Analysis</CardTitle>
              <CardDescription>Insights into how clients are engaging with our calls</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Key metrics and charts will be displayed here.</div>
              <MessageSquare className="h-6 w-6 mr-2 inline-block" />
              <p>Analyzing client engagement patterns to improve call strategies.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Analytics;
