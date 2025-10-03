import { 
  users, devices, waterLevels, wasteBins, contacts, settings, fcmTokens,
  type User, type InsertUser,
  type Device, type InsertDevice,
  type WaterLevel, type InsertWaterLevel,
  type WasteBin, type InsertWasteBin,
  type Contact, type InsertContact,
  type Settings, type InsertSettings,
  type FcmToken, type InsertFcmToken
} from "@shared/schema";

// modify the interface with any CRUD methods
// you might need

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Device methods
  getDevices(userId: number): Promise<Device[]>;
  getDevice(id: number): Promise<Device | undefined>;
  createDevice(device: InsertDevice): Promise<Device>;
  updateDevice(id: number, device: Partial<InsertDevice>): Promise<Device | undefined>;
  
  // Water level methods
  getWaterLevels(userId: number): Promise<WaterLevel[]>;
  getWaterLevelsByDevice(deviceId: number): Promise<WaterLevel[]>;
  createWaterLevel(waterLevel: InsertWaterLevel): Promise<WaterLevel>;
  
  // Waste bin methods
  getWasteBins(userId: number): Promise<WasteBin[]>;
  getWasteBinsByDevice(deviceId: number): Promise<WasteBin[]>;
  createWasteBin(wasteBin: InsertWasteBin): Promise<WasteBin>;
  
  // FCM Token methods
  getFcmTokens(userId: number): Promise<FcmToken[]>;
  getAllFcmTokens(): Promise<FcmToken[]>;
  createFcmToken(token: InsertFcmToken): Promise<FcmToken>;
  updateFcmToken(token: string, lastUsed: string): Promise<void>;
  deleteFcmToken(token: string): Promise<void>;
  
  // Get all data methods (for simple push notifications)
  getAllWaterLevels(): Promise<WaterLevel[]>;
  getAllWasteBins(): Promise<WasteBin[]>;
  getAllDevices(): Promise<Device[]>;
  
  // Settings methods
  getSettings(userId: number): Promise<Settings | undefined>;
  createSettings(settings: InsertSettings): Promise<Settings>;
  updateSettings(userId: number, settings: Partial<InsertSettings>): Promise<Settings | undefined>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private devices: Map<number, Device>;
  private waterLevels: Map<number, WaterLevel>;
  private wasteBins: Map<number, WasteBin>;
  private contacts: Map<number, Contact>;
  private settings: Map<number, Settings>;
  private fcmTokens: Map<number, FcmToken>;
  private tokenToId: Map<string, number>;
  currentId: number;

  constructor() {
    this.users = new Map();
    this.devices = new Map();
    this.waterLevels = new Map();
    this.wasteBins = new Map();
    this.contacts = new Map();
    this.settings = new Map();
    this.fcmTokens = new Map();
    this.tokenToId = new Map();
    this.currentId = 1;
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email === email,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentId++;
    const user: User = { 
      ...insertUser, 
      id,
      firebaseUid: insertUser.firebaseUid || null
    };
    this.users.set(id, user);
    return user;
  }

  // Device methods
  async getDevices(userId: number): Promise<Device[]> {
    return Array.from(this.devices.values()).filter(device => device.userId === userId);
  }

  async getDevice(id: number): Promise<Device | undefined> {
    return this.devices.get(id);
  }

  async createDevice(insertDevice: InsertDevice): Promise<Device> {
    const id = this.currentId++;
    const device: Device = { 
      ...insertDevice, 
      id,
      location: insertDevice.location || null,
      lastSeen: insertDevice.lastSeen || null
    };
    this.devices.set(id, device);
    return device;
  }

  async updateDevice(id: number, updateData: Partial<InsertDevice>): Promise<Device | undefined> {
    const device = this.devices.get(id);
    if (!device) return undefined;
    
    const updatedDevice = { ...device, ...updateData };
    this.devices.set(id, updatedDevice);
    return updatedDevice;
  }

  // Water level methods
  async getWaterLevels(userId: number): Promise<WaterLevel[]> {
    return Array.from(this.waterLevels.values()).filter(level => level.userId === userId);
  }

  async getWaterLevelsByDevice(deviceId: number): Promise<WaterLevel[]> {
    return Array.from(this.waterLevels.values()).filter(level => level.deviceId === deviceId);
  }

  async createWaterLevel(insertWaterLevel: InsertWaterLevel): Promise<WaterLevel> {
    const id = this.currentId++;
    const waterLevel: WaterLevel = { ...insertWaterLevel, id };
    this.waterLevels.set(id, waterLevel);
    return waterLevel;
  }

  // Waste bin methods
  async getWasteBins(userId: number): Promise<WasteBin[]> {
    return Array.from(this.wasteBins.values()).filter(bin => bin.userId === userId);
  }

  async getWasteBinsByDevice(deviceId: number): Promise<WasteBin[]> {
    return Array.from(this.wasteBins.values()).filter(bin => bin.deviceId === deviceId);
  }

  async createWasteBin(insertWasteBin: InsertWasteBin): Promise<WasteBin> {
    const id = this.currentId++;
    const wasteBin: WasteBin = { 
      ...insertWasteBin, 
      id,
      lastEmptied: insertWasteBin.lastEmptied || null
    };
    this.wasteBins.set(id, wasteBin);
    return wasteBin;
  }

  // FCM Token methods
  async getFcmTokens(userId: number): Promise<FcmToken[]> {
    return Array.from(this.fcmTokens.values()).filter(token => token.userId === userId);
  }

  async createFcmToken(insertToken: InsertFcmToken): Promise<FcmToken> {
    const id = this.currentId++;
    const token: FcmToken = { 
      ...insertToken, 
      id,
      deviceInfo: insertToken.deviceInfo || null,
      isActive: insertToken.isActive ?? true,
      lastUsed: insertToken.lastUsed || null
    };
    this.fcmTokens.set(id, token);
    this.tokenToId.set(token.token, id);
    return token;
  }

  async updateFcmToken(tokenStr: string, lastUsed: string): Promise<void> {
    const id = this.tokenToId.get(tokenStr);
    if (!id) return;
    
    const token = this.fcmTokens.get(id);
    if (token) {
      const updatedToken = { ...token, lastUsed };
      this.fcmTokens.set(id, updatedToken);
    }
  }

  async deleteFcmToken(tokenStr: string): Promise<void> {
    const id = this.tokenToId.get(tokenStr);
    if (!id) return;
    
    this.fcmTokens.delete(id);
    this.tokenToId.delete(tokenStr);
  }

  async getAllFcmTokens(): Promise<FcmToken[]> {
    return Array.from(this.fcmTokens.values());
  }

  async getAllWaterLevels(): Promise<WaterLevel[]> {
    return Array.from(this.waterLevels.values());
  }

  async getAllWasteBins(): Promise<WasteBin[]> {
    return Array.from(this.wasteBins.values());
  }

  async getAllDevices(): Promise<Device[]> {
    return Array.from(this.devices.values());
  }

  // Settings methods
  async getSettings(userId: number): Promise<Settings | undefined> {
    return Array.from(this.settings.values()).find(setting => setting.userId === userId);
  }

  async createSettings(insertSettings: InsertSettings): Promise<Settings> {
    const id = this.currentId++;
    const settings: Settings = { ...insertSettings, id };
    this.settings.set(id, settings);
    return settings;
  }

  async updateSettings(userId: number, updateData: Partial<InsertSettings>): Promise<Settings | undefined> {
    const settings = Array.from(this.settings.values()).find(s => s.userId === userId);
    if (!settings) return undefined;
    
    const updatedSettings = { ...settings, ...updateData };
    this.settings.set(settings.id, updatedSettings);
    return updatedSettings;
  }
}

export const storage = new MemStorage();
