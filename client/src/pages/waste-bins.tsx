import { useEffect, useState, useMemo } from "react";
import { ref, onValue } from "firebase/database";
import { database } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { WasteBin } from "@/types";
import { Link } from "wouter";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

export default function WasteBins() {
  const { user } = useAuth();
  const [wasteBins, setWasteBins] = useState<WasteBin[]>([]);
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [timeRange, setTimeRange] = useState<string>("30days");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const binsRef = ref(database, `users/${user.uid}/wasteBins`);
    const historyRef = ref(database, `users/${user.uid}/wasteCollectionHistory`);

    // Subscribe to waste bin data
    const binsUnsubscribe = onValue(binsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const bins = Object.entries(data).map(([id, value]) => ({
          id,
          ...(value as any),
        }));
        setWasteBins(bins);
      } else {
        setWasteBins([]);
      }
      setLoading(false);
    });

    // Subscribe to history data
    const historyUnsubscribe = onValue(historyRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        // Format history data for chart
        const formattedData = Object.entries(data).map(([date, bins]: [string, any]) => {
          const entry: any = { date };
          
          if (bins) {
            Object.entries(bins).forEach(([binId, data]: [string, any]) => {
              entry[binId] = data.weight || 0;
              entry[`${binId}_fullness`] = data.fullness || 0;
            });
          }
          
          return entry;
        });
        
        setHistoryData(formattedData);
      } else {
        setHistoryData([]);
      }
    });

    return () => {
      binsUnsubscribe();
      historyUnsubscribe();
    };
  }, [user]);

  // Calculate statistics
  const totalBins = wasteBins.length;
  const totalWeight = wasteBins.reduce((sum, bin) => sum + (bin.weight || 0), 0);
  const averageFullness = wasteBins.length 
    ? Math.round(wasteBins.reduce((sum, bin) => sum + (bin.fullness || 0), 0) / wasteBins.length) 
    : 0;

  // Filter history data based on selected time range
  const filteredHistoryData = useMemo(() => {
    if (!historyData.length) return [];
    
    let filtered = [...historyData];
    
    // Apply time range filter
    if (timeRange === "30days") {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      filtered = filtered.filter(item => new Date(item.date) >= thirtyDaysAgo);
    } else if (timeRange === "90days") {
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
      filtered = filtered.filter(item => new Date(item.date) >= ninetyDaysAgo);
    } else if (timeRange === "1year") {
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      filtered = filtered.filter(item => new Date(item.date) >= oneYearAgo);
    }
    
    // Sort by date
    filtered.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    return filtered;
  }, [historyData, timeRange]);

  return (
    <DashboardLayout 
      title="Waste Bins" 
      subtitle="Monitor waste collection across your system"
    >
      {wasteBins.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">Total Bins</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalBins}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">Average Fullness</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{averageFullness}%</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">Total Waste Collected</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalWeight}kg</div>
            </CardContent>
          </Card>
        </div>
      )}
      
      <Card className="mb-6">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Waste Bins Status</CardTitle>
            <Link href="/devices">
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Bin
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {wasteBins.length === 0 && !loading ? (
            <div className="py-8 text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mb-4">
                <Trash2 className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-medium text-gray-800 mb-2">No Waste Bins</h3>
              <p className="text-gray-500 mb-6">Add waste bins to start monitoring collection.</p>
              <Link href="/devices">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Your First Bin
                </Button>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Bin ID</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Location</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Fullness</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Weight</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Last Emptied</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Status</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {wasteBins.map(bin => (
                    <tr key={bin.id} className="border-b border-gray-200">
                      <td className="py-3 px-4">{bin.id}</td>
                      <td className="py-3 px-4">{bin.location}</td>
                      <td className="py-3 px-4">
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${getBinFullnessColor(bin.fullness)}`} 
                            style={{ width: `${bin.fullness}%` }}
                          ></div>
                        </div>
                        <div className="text-xs mt-1">{bin.fullness}%</div>
                      </td>
                      <td className="py-3 px-4">{bin.weight}kg</td>
                      <td className="py-3 px-4">{bin.lastEmptied}</td>
                      <td className="py-3 px-4">
                        <span className={`status-badge ${getBinStatusClass(bin.fullness)}`}>
                          {getBinStatus(bin.fullness)}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex space-x-3">
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Pencil className="h-4 w-4 text-gray-500 hover:text-primary" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Trash2 className="h-4 w-4 text-gray-500 hover:text-destructive" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Waste Collection History */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Waste Collection History</CardTitle>
            <Select 
              value={timeRange} 
              onValueChange={setTimeRange}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Last 30 days" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30days">Last 30 days</SelectItem>
                <SelectItem value="90days">Last 90 days</SelectItem>
                <SelectItem value="1year">Last year</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {filteredHistoryData.length > 0 ? (
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={filteredHistoryData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(value) => new Date(value).toLocaleDateString()} 
                  />
                  <YAxis />
                  <Tooltip 
                    formatter={(value) => [`${value}kg`, 'Weight']}
                    labelFormatter={(label) => new Date(label).toLocaleDateString()}
                  />
                  <Legend />
                  
                  {wasteBins.map((bin, index) => (
                    <Bar 
                      key={bin.id} 
                      dataKey={bin.id} 
                      name={bin.location || bin.id} 
                      fill={getBinColor(index)} 
                      stackId="a" 
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-gray-500">
              {loading ? "Loading data..." : "No historical data available"}
            </div>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}

function getBinFullnessColor(fullness: number): string {
  if (fullness > 85) return "bg-destructive";
  if (fullness > 65) return "bg-warning";
  return "bg-success";
}

function getBinStatus(fullness: number): string {
  if (fullness > 85) return "Critical";
  if (fullness > 65) return "Needs Attention";
  return "Good";
}

function getBinStatusClass(fullness: number): string {
  if (fullness > 85) return "status-badge-danger";
  if (fullness > 65) return "status-badge-warning";
  return "status-badge-success";
}

function getBinColor(index: number): string {
  const colors = ["#2196F3", "#4CAF50", "#FFC107", "#F44336", "#9C27B0"];
  return colors[index % colors.length];
}
