import { describe, it, expect } from 'vitest';
import {
  serializeIpcMessage,
  deserializeIpcMessage,
  type IpcMessage,
  getSocketDir,
  getSocketPath,
  getInstancesFilePath,
} from './ipc.types';

describe('IpcMessage serialization', () => {
  it('should serialize an IpcMessage to NDJSON line', () => {
    const msg: IpcMessage = {
      type: 'agent:activated',
      payload: {
        agentId: 'arch',
        name: 'architecture',
        role: 'specialist',
        isPrimary: true,
      },
    };
    const line = serializeIpcMessage(msg);
    expect(line).toBe(JSON.stringify(msg) + '\n');
  });

  it('should deserialize an NDJSON line to IpcMessage', () => {
    const msg: IpcMessage = {
      type: 'mode:changed',
      payload: { from: null, to: 'PLAN' },
    };
    const line = JSON.stringify(msg) + '\n';
    const result = deserializeIpcMessage(line);
    expect(result).toEqual(msg);
  });

  it('should return null for invalid JSON', () => {
    const result = deserializeIpcMessage('not-json\n');
    expect(result).toBeNull();
  });

  it('should return null for object missing type field', () => {
    const result = deserializeIpcMessage(
      JSON.stringify({ payload: {} }) + '\n',
    );
    expect(result).toBeNull();
  });

  it('should return null for object missing payload field', () => {
    const result = deserializeIpcMessage(
      JSON.stringify({ type: 'agent:activated' }) + '\n',
    );
    expect(result).toBeNull();
  });

  it('should return null for empty string', () => {
    const result = deserializeIpcMessage('');
    expect(result).toBeNull();
  });

  it('should generate socket path from PID', () => {
    const path = require('path');
    const socketPath = getSocketPath(12345);
    expect(socketPath).toBe(
      path.join(getSocketDir(), 'codingbuddy-12345.sock'),
    );
  });

  it('should return instances file path under home dir', () => {
    const filePath = getInstancesFilePath();
    expect(filePath).toContain('.codingbuddy');
    expect(filePath).toContain('instances.json');
  });

  it('should return null for unknown event type', () => {
    const result = deserializeIpcMessage(
      JSON.stringify({ type: 'unknown:event', payload: {} }) + '\n',
    );
    expect(result).toBeNull();
  });
});
