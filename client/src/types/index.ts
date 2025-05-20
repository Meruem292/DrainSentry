// User data types
export interface WaterLevel {
  id: string;
  location: string;
  level: number;
  lastUpdated: string;
}

export interface WasteBin {
  id: string;
  location: string;
  fullness: number;
  weight: number;
  lastEmptied: string;
}

export interface Device {
  id: string;
  name: string;
  location: string;
  status: "active" | "inactive";
  lastSeen: string;
}

export interface Contact {
  id: string;
  name: string;
  phone: string;
  status: "active" | "inactive";
}

export interface Settings {
  system: {
    name: string;
    dataRefreshInterval: string;
    dataRetentionPeriod: string;
  };
  regional: {
    timeZone: string;
  };
  thresholds: {
    waterLevel: number;
    binFullness: number;
    wasteWeight: number;
  };
  notifications: {
    smsEnabled: boolean;
    emailEnabled: boolean;
    emailAddress?: string;
  };
}

export interface WaterLevelHistory {
  date: string;
  [stationId: string]: number | string;
}

export interface WasteBinHistory {
  date: string;
  [binId: string]: {
    weight: number;
    fullness: number;
  } | string;
}
