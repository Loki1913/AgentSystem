import crypto from 'node:crypto';
import { Config } from '../config.js';

export interface PairedDevice {
  id: string;
  name: string;
  hostname: string;
  os: string;
  allowedDirectories: string[];
  registeredAt: string;
  lastHeartbeat: string;
  status: 'online' | 'offline' | 'revoked';
}

export interface BridgeOperation {
  id: string;
  deviceId: string;
  action: 'read' | 'write' | 'list' | 'sync';
  path: string;
  status: 'pending' | 'completed' | 'failed' | 'rejected';
  requestedAt: string;
  completedAt?: string;
  error?: string;
}

export class LocalBridgeManager {
  private devices: Map<string, PairedDevice> = new Map();
  private pendingOperations: Map<string, BridgeOperation> = new Map();
  private operationHistory: BridgeOperation[] = [];

  constructor() {
    // Seed default sample paired device profile for the user
    this.devices.set('dev_win_default', {
      id: 'dev_win_default',
      name: 'Windows Desktop Workstation',
      hostname: 'DESKTOP-WIN-USER',
      os: 'Windows 11 x64',
      allowedDirectories: [
        'C:\\Proyectos\\AgentSystem',
        'C:\\Workspace\\Proyectos'
      ],
      registeredAt: new Date().toISOString(),
      lastHeartbeat: new Date().toISOString(),
      status: 'online'
    });
  }

  public authenticate(token: string): boolean {
    const secret = Config.localBridgeSecret;
    return Boolean(token && secret && token === secret);
  }

  public registerDevice(name: string, hostname: string, os: string, allowedDirectories: string[]): PairedDevice {
    const id = 'dev_' + crypto.randomBytes(6).toString('hex');
    const device: PairedDevice = {
      id,
      name: name.slice(0, 50),
      hostname: hostname.slice(0, 50),
      os: os.slice(0, 50),
      allowedDirectories: allowedDirectories.map(d => d.trim()).filter(Boolean),
      registeredAt: new Date().toISOString(),
      lastHeartbeat: new Date().toISOString(),
      status: 'online'
    };
    this.devices.set(id, device);
    return device;
  }

  public updateHeartbeat(deviceId: string): void {
    const dev = this.devices.get(deviceId);
    if (dev && dev.status !== 'revoked') {
      dev.lastHeartbeat = new Date().toISOString();
      dev.status = 'online';
    }
  }

  public listDevices(): PairedDevice[] {
    return Array.from(this.devices.values());
  }

  public revokeDevice(deviceId: string): boolean {
    const dev = this.devices.get(deviceId);
    if (dev) {
      dev.status = 'revoked';
      return true;
    }
    return false;
  }

  public queueOperation(deviceId: string, action: BridgeOperation['action'], targetPath: string): BridgeOperation {
    const dev = this.devices.get(deviceId);
    if (!dev || dev.status !== 'online') {
      throw new Error(`El dispositivo Windows [${deviceId}] no está conectado o está fuera de línea.`);
    }

    // Path confinement verification
    const isAllowed = dev.allowedDirectories.some(dir =>
      targetPath.toLowerCase().startsWith(dir.toLowerCase())
    );
    if (!isAllowed) {
      throw new Error(`Acceso denegado: La ruta "${targetPath}" no está en la lista de carpetas autorizadas de Windows.`);
    }

    const op: BridgeOperation = {
      id: 'op_' + crypto.randomBytes(6).toString('hex'),
      deviceId,
      action,
      path: targetPath,
      status: 'pending',
      requestedAt: new Date().toISOString()
    };

    this.pendingOperations.set(op.id, op);
    return op;
  }

  public completeOperation(opId: string, success: boolean, error?: string): void {
    const op = this.pendingOperations.get(opId);
    if (op) {
      op.status = success ? 'completed' : 'failed';
      op.completedAt = new Date().toISOString();
      op.error = error;
      this.pendingOperations.delete(opId);
      this.operationHistory.unshift(op);
      if (this.operationHistory.length > 100) this.operationHistory.pop();
    }
  }

  public getHistory(limit = 20): BridgeOperation[] {
    return this.operationHistory.slice(0, limit);
  }
}

export const localBridgeManager = new LocalBridgeManager();
