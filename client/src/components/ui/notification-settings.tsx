import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Bell, BellOff, AlertTriangle, Droplets, Trash2, WifiOff } from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';

interface NotificationSettingsProps {
  // No need for userId prop - get from auth context
}

export function NotificationSettings({}: NotificationSettingsProps) {
  const {
    permissionGranted,
    fcmToken,
    alerts,
    alertsLoading,
    alertsError,
    enableNotifications,
    disableNotifications,
    registeringToken,
  } = useNotifications();

  const [notificationTypes, setNotificationTypes] = useState({
    waterLevel: true,
    wasteBin: true,
    deviceOffline: true,
  });

  const handleToggleNotifications = async () => {
    if (permissionGranted && fcmToken) {
      await disableNotifications();
    } else {
      await enableNotifications();
    }
  };

  const getCriticalAlertsCount = () => {
    return alerts.filter((alert: any) => alert.severity === 'critical').length;
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'water_level':
        return <Droplets className="h-4 w-4" />;
      case 'waste_bin':
        return <Trash2 className="h-4 w-4" />;
      case 'device_offline':
        return <WifiOff className="h-4 w-4" />;
      default:
        return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'destructive';
      case 'high':
        return 'destructive';
      case 'medium':
        return 'default';
      case 'low':
        return 'secondary';
      default:
        return 'default';
    }
  };

  return (
    <div className="space-y-6" data-testid="notification-settings">
      {/* Main Notification Toggle */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {permissionGranted && fcmToken ? (
                <Bell className="h-5 w-5 text-green-600" />
              ) : (
                <BellOff className="h-5 w-5 text-gray-400" />
              )}
              <CardTitle>Push Notifications</CardTitle>
            </div>
            {permissionGranted && fcmToken && (
              <Badge variant="secondary" data-testid="status-enabled">
                Enabled
              </Badge>
            )}
          </div>
          <CardDescription>
            Receive instant alerts for critical system events and device status changes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="notifications-toggle">Enable Push Notifications</Label>
              <p className="text-sm text-muted-foreground">
                Get notified about critical alerts even when the app is closed
              </p>
            </div>
            <Button
              onClick={handleToggleNotifications}
              disabled={registeringToken}
              variant={permissionGranted && fcmToken ? "destructive" : "default"}
              data-testid="button-toggle-notifications"
            >
              {registeringToken ? (
                "Processing..."
              ) : permissionGranted && fcmToken ? (
                "Disable"
              ) : (
                "Enable"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Notification Types */}
      {permissionGranted && fcmToken && (
        <Card>
          <CardHeader>
            <CardTitle>Alert Types</CardTitle>
            <CardDescription>
              Choose which types of alerts you want to receive
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Droplets className="h-4 w-4 text-blue-500" />
                <div className="space-y-1">
                  <Label htmlFor="water-level">Water Level Alerts</Label>
                  <p className="text-sm text-muted-foreground">
                    High water levels and flood warnings
                  </p>
                </div>
              </div>
              <Switch
                id="water-level"
                checked={notificationTypes.waterLevel}
                onCheckedChange={(checked) =>
                  setNotificationTypes(prev => ({ ...prev, waterLevel: checked }))
                }
                data-testid="switch-water-level"
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Trash2 className="h-4 w-4 text-green-500" />
                <div className="space-y-1">
                  <Label htmlFor="waste-bin">Waste Bin Alerts</Label>
                  <p className="text-sm text-muted-foreground">
                    Full waste bins needing emptying
                  </p>
                </div>
              </div>
              <Switch
                id="waste-bin"
                checked={notificationTypes.wasteBin}
                onCheckedChange={(checked) =>
                  setNotificationTypes(prev => ({ ...prev, wasteBin: checked }))
                }
                data-testid="switch-waste-bin"
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <WifiOff className="h-4 w-4 text-red-500" />
                <div className="space-y-1">
                  <Label htmlFor="device-offline">Device Status Alerts</Label>
                  <p className="text-sm text-muted-foreground">
                    Offline devices and connectivity issues
                  </p>
                </div>
              </div>
              <Switch
                id="device-offline"
                checked={notificationTypes.deviceOffline}
                onCheckedChange={(checked) =>
                  setNotificationTypes(prev => ({ ...prev, deviceOffline: checked }))
                }
                data-testid="switch-device-offline"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Current Alerts */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Current Alerts</CardTitle>
            {getCriticalAlertsCount() > 0 && (
              <Badge variant="destructive" data-testid="critical-alerts-count">
                {getCriticalAlertsCount()} Critical
              </Badge>
            )}
          </div>
          <CardDescription>
            Active alerts that require your attention
          </CardDescription>
        </CardHeader>
        <CardContent>
          {alertsError ? (
            <p className="text-sm text-muted-foreground text-red-600">
              Error loading alerts. Please try refreshing the page.
            </p>
          ) : alertsLoading ? (
            <p className="text-sm text-muted-foreground">Loading alerts...</p>
          ) : !Array.isArray(alerts) || alerts.length === 0 ? (
            <p className="text-sm text-muted-foreground" data-testid="no-alerts">
              No active alerts. All systems are running normally.
            </p>
          ) : (
            <div className="space-y-3">
              {alerts.map((alert: any, index: number) => (
                <div
                  key={index}
                  className="flex items-center space-x-3 p-3 rounded-lg border"
                  data-testid={`alert-${alert.type}-${index}`}
                >
                  {getAlertIcon(alert.type)}
                  <div className="flex-1">
                    <p className="font-medium">{alert.message}</p>
                  </div>
                  <Badge 
                    variant={getSeverityColor(alert.severity) as any}
                    data-testid={`alert-severity-${alert.severity}`}
                  >
                    {alert.severity}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}