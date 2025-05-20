import { useEffect, useState } from "react";
import { ref, onValue } from "firebase/database";
import { database } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, 
  Clock, 
  Trash2, 
  BarChart3, 
  AlertTriangle, 
  CalendarClock, 
  ChevronRight,
  Scale,
  PackageOpen
} from "lucide-react";
import { WasteBin } from "@/types";
import { Link } from "wouter";
import { motion } from "framer-motion";

// Helper functions for bin status
function getBinFullnessColor(fullness: number): string {
  if (fullness > 85) return "bg-destructive";
  if (fullness > 60) return "bg-warning";
  return "bg-success";
}

function getBinTextColor(fullness: number): string {
  if (fullness > 85) return "text-destructive";
  if (fullness > 60) return "text-warning";
  return "text-success";
}

function getBinStatus(fullness: number): string {
  if (fullness > 85) return "Full";
  if (fullness > 60) return "Warning";
  return "Empty";
}

function getBinColor(index: number): string {
  const colors = [
    "bg-emerald-500",
    "bg-amber-500",
    "bg-blue-500",
    "bg-purple-500",
    "bg-rose-500",
    "bg-teal-500",
  ];
  return colors[index % colors.length];
}

export default function WasteBins() {
  const { user } = useAuth();
  const [binsData, setBinsData] = useState<WasteBin[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const binsRef = ref(database, `users/${user.uid}/wasteBins`);
    
    const unsubscribe = onValue(binsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const bins = Object.entries(data).map(([id, value]) => ({
          id,
          ...(value as any),
        }));
        setBinsData(bins);
      } else {
        setBinsData([]);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  return (
    <DashboardLayout 
      title="Waste Bins" 
      subtitle="Monitor waste bins across your network"
    >
      {binsData.length === 0 && !loading ? (
        <div className="bg-white rounded-lg shadow-sm p-8 mb-6 flex flex-col items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mb-4">
            <Trash2 className="h-6 w-6 text-emerald-600" />
          </div>
          <h3 className="text-lg font-medium text-gray-800 mb-2">No Waste Bins</h3>
          <p className="text-gray-500 text-center mb-6">There are currently no waste bin devices available for monitoring.</p>
          <Link href="/devices">
            <Button>
              <Plus className="h-5 w-5 mr-2" />
              Add New Bin
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Summary Cards */}
          {binsData.length > 0 && (
            <div className="mb-8">
              <div className="grid gap-4 md:grid-cols-3">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <Card className="border-2 hover:border-emerald-500/70 hover:shadow-lg transition-all duration-300">
                    <CardHeader className="pb-2 bg-gradient-to-r from-green-50 to-transparent">
                      <div className="flex items-center">
                        <BarChart3 className="h-5 w-5 text-emerald-600 mr-2" />
                        <CardTitle className="text-sm font-medium">Average Fullness</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {Math.round(binsData.reduce((sum, bin) => sum + bin.fullness, 0) / binsData.length)}%
                      </div>
                      <p className="text-xs text-gray-500">Across all waste bins</p>
                    </CardContent>
                  </Card>
                </motion.div>
                
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.1 }}
                >
                  <Card className="border-2 hover:border-red-500/70 hover:shadow-lg transition-all duration-300">
                    <CardHeader className="pb-2 bg-gradient-to-r from-red-50 to-transparent">
                      <div className="flex items-center">
                        <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
                        <CardTitle className="text-sm font-medium">Bins Requiring Service</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {binsData.filter(bin => bin.fullness > 85).length}
                      </div>
                      <p className="text-xs text-gray-500">Bins that need emptying</p>
                    </CardContent>
                  </Card>
                </motion.div>
                
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.2 }}
                >
                  <Card className="border-2 hover:border-blue-500/70 hover:shadow-lg transition-all duration-300">
                    <CardHeader className="pb-2 bg-gradient-to-r from-blue-50 to-transparent">
                      <div className="flex items-center">
                        <Scale className="h-5 w-5 text-blue-600 mr-2" />
                        <CardTitle className="text-sm font-medium">Total Weight</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {Math.round(binsData.reduce((sum, bin) => sum + bin.weight, 0))} kg
                      </div>
                      <p className="text-xs text-gray-500">Total waste collected</p>
                    </CardContent>
                  </Card>
                </motion.div>
              </div>
            </div>
          )}
          
          {/* Waste Bin Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {binsData.map((bin, index) => (
              <motion.div
                key={bin.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 + (index * 0.05) }}
                whileHover={{ scale: 1.02 }}
              >
                <Link href={`/waste-bins/${bin.id}`} className="block h-full">
                  <Card className="h-full border-2 hover:border-emerald-500 hover:shadow-lg transition-all duration-300 overflow-hidden cursor-pointer">
                    <CardHeader className="pb-3 bg-gradient-to-r from-green-50 to-transparent">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${getBinFullnessColor(bin.fullness)}`}></div>
                          <CardTitle className="text-base font-medium text-gray-800">
                            {bin.location || bin.id}
                          </CardTitle>
                        </div>
                        <Badge 
                          variant="outline" 
                          className={`${
                            bin.fullness > 85 ? 'bg-red-50 text-red-500' : 
                            bin.fullness > 60 ? 'bg-amber-50 text-amber-500' : 
                            'bg-green-50 text-green-500'
                          }`}
                        >
                          {getBinStatus(bin.fullness)}
                        </Badge>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="pt-2">
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-sm text-gray-500">Fullness</span>
                            <span className="text-sm font-medium">{bin.fullness}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                            <div 
                              className={`h-2.5 rounded-full ${getBinFullnessColor(bin.fullness)}`} 
                              style={{ width: `${bin.fullness}%` }}
                            ></div>
                          </div>
                        </div>
                        
                        <div>
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-sm text-gray-500">Weight</span>
                            <span className="text-sm font-medium">{bin.weight} kg</span>
                          </div>
                          <div className="flex items-center">
                            <PackageOpen className="h-4 w-4 text-blue-500 mr-1" />
                            <span className="text-xs text-gray-500">Capacity: 100kg</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <div className="flex items-center text-xs text-gray-500">
                          <CalendarClock className="h-3 w-3 mr-1" />
                          <span>Last emptied: {bin.lastEmptied || 'Unknown'}</span>
                        </div>
                        <div className="flex items-center text-xs text-emerald-600">
                          <span>View Details</span>
                          <ChevronRight className="h-3 w-3 ml-1" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}