import { useState, useEffect } from "react";
import { ref, onValue, set } from "firebase/database";
import { database } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings as SettingsType } from "@/types";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function Settings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<SettingsType>({
    system: {
      name: "DrainSentry",
      dataRefreshInterval: "30",
      dataRetentionPeriod: "6",
    },
    regional: {
      timeZone: "UTC-8",
    },
    thresholds: {
      waterLevel: 75,
      binFullness: 80,
      wasteWeight: 50,
    },
    notifications: {
      smsEnabled: true,
      emailEnabled: false,
      emailAddress: "",
    }
  });
  
  useEffect(() => {
    if (!user) return;

    const settingsRef = ref(database, `users/${user.uid}/settings`);
    
    const unsubscribe = onValue(settingsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setSettings(data);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const handleSaveSettings = async (section: 'system' | 'regional' | 'notifications') => {
    if (!user) return;
    
    try {
      const settingsRef = ref(database, `users/${user.uid}/settings/${section}`);
      await set(settingsRef, settings[section]);
      
      toast({
        title: "Settings saved",
        description: "Your settings have been updated successfully",
      });
    } catch (error) {
      console.error(`Error saving ${section} settings:`, error);
      toast({
        title: "Failed to save settings",
        description: "There was an error saving your settings. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <DashboardLayout title="Settings" subtitle="Configure system parameters and thresholds">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout 
      title="Settings" 
      subtitle="Configure system parameters and thresholds"
    >
      <Tabs defaultValue="general" className="w-full">
        <TabsList className="mb-6 border-b border-gray-200 w-full justify-start rounded-none bg-transparent">
          <TabsTrigger 
            value="general" 
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent text-gray-500 data-[state=active]:text-primary"
          >
            General
          </TabsTrigger>

          <TabsTrigger 
            value="notifications" 
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent text-gray-500 data-[state=active]:text-primary"
          >
            Notifications
          </TabsTrigger>
          <TabsTrigger 
            value="account" 
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent text-gray-500 data-[state=active]:text-primary"
          >
            Account
          </TabsTrigger>
        </TabsList>
        
        {/* General Settings Tab */}
        <TabsContent value="general">
          <h3 className="text-lg font-medium text-gray-800 mb-6">System Settings</h3>
          
          <Card className="mb-6">
            <CardContent className="p-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="systemName">System Name</Label>
                  <Input 
                    id="systemName" 
                    value={settings.system.name} 
                    onChange={(e) => setSettings({
                      ...settings,
                      system: {
                        ...settings.system,
                        name: e.target.value
                      }
                    })}
                    className="mt-1"
                  />
                </div>
                
                <div>
                  <Label htmlFor="dataRefreshInterval">Data Refresh Interval</Label>
                  <Select 
                    value={settings.system.dataRefreshInterval}
                    onValueChange={(value) => setSettings({
                      ...settings,
                      system: {
                        ...settings.system,
                        dataRefreshInterval: value
                      }
                    })}
                  >
                    <SelectTrigger className="mt-1 w-full">
                      <SelectValue placeholder="Select refresh interval" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30">30 seconds</SelectItem>
                      <SelectItem value="60">1 minute</SelectItem>
                      <SelectItem value="300">5 minutes</SelectItem>
                      <SelectItem value="900">15 minutes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="dataRetentionPeriod">Data Retention Period</Label>
                  <Select 
                    value={settings.system.dataRetentionPeriod}
                    onValueChange={(value) => setSettings({
                      ...settings,
                      system: {
                        ...settings.system,
                        dataRetentionPeriod: value
                      }
                    })}
                  >
                    <SelectTrigger className="mt-1 w-full">
                      <SelectValue placeholder="Select retention period" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 month</SelectItem>
                      <SelectItem value="3">3 months</SelectItem>
                      <SelectItem value="6">6 months</SelectItem>
                      <SelectItem value="12">1 year</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <h3 className="text-lg font-medium text-gray-800 mb-6">Regional Settings</h3>
          
          <Card className="mb-6">
            <CardContent className="p-6">
              <div>
                <Label htmlFor="timeZone">Time Zone</Label>
                <Select 
                  value={settings.regional.timeZone}
                  onValueChange={(value) => setSettings({
                    ...settings,
                    regional: {
                      ...settings.regional,
                      timeZone: value
                    }
                  })}
                >
                  <SelectTrigger className="mt-1 w-full">
                    <SelectValue placeholder="Select time zone" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UTC-8">UTC-8 (Pacific Time)</SelectItem>
                    <SelectItem value="UTC-5">UTC-5 (Eastern Time)</SelectItem>
                    <SelectItem value="UTC+0">UTC+0 (GMT)</SelectItem>
                    <SelectItem value="UTC+8">UTC+8 (Singapore/HK)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
          
          <div className="flex justify-end">
            <Button onClick={() => {
              handleSaveSettings('system');
              handleSaveSettings('regional');
            }}>
              Save Changes
            </Button>
          </div>
        </TabsContent>
        
        {/* Notifications Tab */}
        <TabsContent value="notifications">
          <h3 className="text-lg font-medium text-gray-800 mb-6">Notification Settings</h3>
          <p className="text-gray-600 mb-6">Configure how you'd like to receive alerts from the system.</p>
          
          <Card className="mb-6">
            <CardContent className="p-6">
              <div className="space-y-6">
                <div className="flex items-start space-x-3">
                  <input
                    type="checkbox" 
                    id="smsEnabled"
                    checked={settings.notifications.smsEnabled}
                    onChange={(e) => setSettings({
                      ...settings,
                      notifications: {
                        ...settings.notifications,
                        smsEnabled: e.target.checked
                      }
                    })}
                    className="mt-1"
                  />
                  <div>
                    <Label htmlFor="smsEnabled" className="font-medium">SMS Notifications</Label>
                    <p className="text-sm text-gray-500">
                      Receive SMS messages when alerts are triggered. Manage contacts in the Contacts page.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <input
                    type="checkbox" 
                    id="emailEnabled"
                    checked={settings.notifications.emailEnabled}
                    onChange={(e) => setSettings({
                      ...settings,
                      notifications: {
                        ...settings.notifications,
                        emailEnabled: e.target.checked
                      }
                    })}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <Label htmlFor="emailEnabled" className="font-medium">Email Notifications</Label>
                    <p className="text-sm text-gray-500 mb-2">
                      Receive email notifications when alerts are triggered.
                    </p>
                    
                    {settings.notifications.emailEnabled && (
                      <div>
                        <Label htmlFor="emailAddress">Email Address</Label>
                        <Input 
                          id="emailAddress" 
                          type="email" 
                          value={settings.notifications.emailAddress || ""}
                          onChange={(e) => setSettings({
                            ...settings,
                            notifications: {
                              ...settings.notifications,
                              emailAddress: e.target.value
                            }
                          })}
                          className="mt-1"
                          placeholder="Enter your email address"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <div className="flex justify-end">
            <Button onClick={() => handleSaveSettings('notifications')}>
              Save Changes
            </Button>
          </div>
        </TabsContent>
        
        {/* Account Tab */}
        <TabsContent value="account">
          <h3 className="text-lg font-medium text-gray-800 mb-6">Account Information</h3>
          
          <Card className="mb-6">
            <CardContent className="p-6">
              <div className="space-y-4">
                <div>
                  <Label>Email Address</Label>
                  <div className="mt-1 text-gray-700 font-medium">{user?.email}</div>
                </div>
                
                <div>
                  <Label>Account Type</Label>
                  <div className="mt-1 text-gray-700 font-medium">Standard</div>
                </div>
                
                <div>
                  <Label>Account Created</Label>
                  <div className="mt-1 text-gray-700 font-medium">
                    {user?.metadata?.creationTime ? new Date(user.metadata.creationTime).toLocaleDateString() : "Unknown"}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
}
