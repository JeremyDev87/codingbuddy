export { TuiIpcServer } from './ipc-server';
export type { TuiIpcServerOptions } from './ipc-server';
export { TuiIpcBridge } from './ipc-bridge';
export { TuiIpcClient } from './ipc-client';
export { IpcStateCache } from './ipc-state-cache';
export { InstanceRegistry } from './instance-registry';
export { ShutdownManager } from './shutdown-manager';
export { MultiSessionManager } from './multi-session-manager';
export type { ManagedSession, MultiSessionManagerOptions } from './multi-session-manager';
export { TuiAutoLauncher } from './tui-auto-launcher';
export type { AutoLaunchOptions, AutoLaunchResult } from './tui-auto-launcher';
export {
  type IpcMessage,
  type IpcInstance,
  type IpcInstancesFile,
  getSocketDir,
  getSocketPath,
  getInstancesFilePath,
} from './ipc.types';
