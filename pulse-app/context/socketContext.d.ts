import type { Socket } from 'socket.io-client';
import type React from 'react';

export interface CurrentUser {
  _id: string;
  id?: string;
  userName: string;
  email?: string;
}

export interface SocketContextValue {
  socket: Socket | null;
  isConnected: boolean;
  isLoggedIn: boolean;
  isLoading: boolean;
  currentUser: CurrentUser | null;
  telemetryLogs: string[];
  addLog: (event: string, description: string) => void;
  login: (token: string, user: CurrentUser) => Promise<void>;
  logout: () => Promise<void>;
}

export declare const SocketProvider: React.FC<{ children: React.ReactNode }>;
export declare function useSystemSocket(): SocketContextValue;
