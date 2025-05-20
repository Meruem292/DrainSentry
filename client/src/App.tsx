import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import WaterLevels from "@/pages/water-levels";
import WaterLevelDetails from "@/pages/water-level-details";
import WasteBins from "@/pages/waste-bins";
import Devices from "@/pages/devices";
import Contacts from "@/pages/contacts";
import Settings from "@/pages/settings";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/" component={Dashboard} />
      <Route path="/water-levels" component={WaterLevels} />
      <Route path="/water-levels/:id" component={WaterLevelDetails} />
      <Route path="/waste-bins" component={WasteBins} />
      <Route path="/devices" component={Devices} />
      <Route path="/contacts" component={Contacts} />
      <Route path="/settings" component={Settings} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
