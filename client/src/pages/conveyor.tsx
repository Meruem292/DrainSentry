import { useEffect, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Power, Loader } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { ref, onValue, update } from "firebase/database";
import { database } from "@/lib/firebase";
import { Device } from "@/types";

export default function Conveyor() {
  const { user } = useAuth();
  const [devices, setDevices] = useState<Device[]>([]);
  // Conveyor state per device id
  const [conveyorStates, setConveyorStates] = useState<Record<string, boolean>>(
    {}
  );
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>(
    {}
  );

  useEffect(() => {
    if (!user) return;
    const devicesRef = ref(database, `users/${user.uid}/devices`);
    const unsubscribe = onValue(devicesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const deviceList = Object.entries(data).map(([firebaseId, value]) => ({
          ...((value as any) ?? {}),
          firebaseId, // add the firebaseId property dynamically
        }));
        setDevices(deviceList as (Device & { firebaseId: string })[]);
      } else {
        setDevices([]);
      }
    });
    return () => unsubscribe();
  }, [user]);

  // Handler for toggling conveyor per device
  const handleToggle = async (firebaseId: string) => {
    if (!user) return;
    setLoadingStates((prev) => ({ ...prev, [firebaseId]: true }));
    const newState = !conveyorStates[firebaseId];
    try {
      // Use the encrypted device ID (the key from Firebase, which is firebaseId here)
      const deviceRef = ref(
        database,
        `users/${user.uid}/devices/${firebaseId}`
      );
      await update(deviceRef, { manualConveyor: newState });
      setConveyorStates((prev) => ({ ...prev, [firebaseId]: newState }));
    } catch (e) {
      // Optionally handle error
    } finally {
      setLoadingStates((prev) => ({ ...prev, [firebaseId]: false }));
    }
  };

  // Listen for manualConveyor state from Firebase
  useEffect(() => {
    if (!user) return;
    const states: Record<string, boolean> = {};
    const devicesRef = ref(database, `users/${user.uid}/devices`);
    const unsubscribe = onValue(devicesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        Object.entries(data).forEach(([firebaseId, value]) => {
          states[firebaseId] = !!(value as any).manualConveyor;
        });
        setConveyorStates(states);
      }
    });
    return () => unsubscribe();
  }, [user]);

  return (
    <DashboardLayout
      title="Conveyor Control"
      subtitle="Manual conveyor operation for each device"
    >
      <div className="max-w-2xl mx-auto mt-10 space-y-6">
        {devices.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>No Devices Found</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-gray-500">
                You have no registered devices. Add a device to control its
                conveyor.
              </div>
            </CardContent>
          </Card>
        ) : (
          devices.map((device) => (
            <Card key={device.firebaseId} className="">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Power
                    className={
                      conveyorStates[device.firebaseId]
                        ? "text-green-500"
                        : "text-gray-400"
                    }
                  />
                  {device.name || device.id} Conveyor
                </CardTitle>
                <div className="text-sm text-gray-500 mt-1">
                  Location: {device.location || "Unknown"}
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center gap-4">
                  <div
                    className={`text-lg font-semibold ${
                      conveyorStates[device.firebaseId]
                        ? "text-green-600"
                        : "text-gray-500"
                    }`}
                  >
                    Conveyor is{" "}
                    {conveyorStates[device.firebaseId] ? "ON" : "OFF"}
                  </div>
                  <Button
                    onClick={() => handleToggle(device.firebaseId)}
                    variant={
                      conveyorStates[device.firebaseId]
                        ? "destructive"
                        : "default"
                    }
                    disabled={loadingStates[device.firebaseId]}
                    className="w-32"
                  >
                    {loadingStates[device.firebaseId] ? (
                      <Loader className="animate-spin h-4 w-4 mr-2" />
                    ) : conveyorStates[device.firebaseId] ? (
                      "Turn OFF"
                    ) : (
                      "Turn ON"
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </DashboardLayout>
  );
}
