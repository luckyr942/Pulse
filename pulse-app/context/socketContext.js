//handle authentication states, local storage tokens, and WebSocket events

import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { BACKEND_URL } from "../config";
import { storage } from '../utils/storage';

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [appUsageLogs, setAppUsageLogs] = useState([]);
  const socketRef = useRef(null);
  const heartbeatRef = useRef(null);

  // to append real-time logs to the Dev dashboard (utility)
  const addLog = (event, description) => {
    const time = new Date().toLocaleTimeString();
    setAppUsageLogs(prev => [`[${time}] ${event}: ${description}`, ...prev].slice(0, 40));
  };

  const stopHeartbeat = () => {
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
    }
  };

  const startHeartbeat = (socketInstance) => {
    stopHeartbeat();
    socketInstance.emit('heartbeat');
    heartbeatRef.current = setInterval(() => {
      socketInstance.emit('heartbeat');
    }, 15000);
  };

  // async storage for session check
  useEffect(() => {
    const checkSession = async () => {
      try {
        const storedToken = await storage.getItem('token');
        const storedUser = await storage.getItem('user');

        if (storedToken && storedUser) {
          setCurrentUser(JSON.parse(storedUser));
          setIsLoggedIn(true);
          await connectSocket(storedToken);
        }
      } catch (err) {
        addLog('SESSION_ERROR', 'Failed to read secure token');
      } finally {
        setTimeout(() => {
          setIsLoading(false);
        }, 1000);
      }
    };
    checkSession();

    return () => {
      stopHeartbeat();
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, []);

  // 2. Open stateful full-duplex WebSocket pipe
  const connectSocket = async (authToken) => {
    if (socketRef.current) return; // prevent duplicate socket connect

    const socketInstance = io(BACKEND_URL, {
      auth: { token: authToken },
      forceNew: true,
      reconnection: true,
      reconnectionAttempts: 5,
      timeout: 10000,
    });

    socketRef.current = socketInstance;

    socketInstance.on('connect', () => {
      setIsConnected(true);
      startHeartbeat(socketInstance);
      addLog('CONNECT', `Linked to gateway. Socket ID: ${socketInstance.id}`);
    });

    socketInstance.on('disconnect', (reason) => {
      setIsConnected(false);
      stopHeartbeat();
      addLog('DISCONNECT', `Server disconnected: ${reason}`);
    });

    socketInstance.on('connect_error', (error) => {
      setIsConnected(false);
      stopHeartbeat();
      addLog('CONNECT_ERROR', error.message || `Unable to reach ${BACKEND_URL}`);
    });

    setSocket(socketInstance);
  };

  // Handle execution on successful HTTP validation login 
  const login = async (token, user) => {
    await storage.setItem('token', token);
    await storage.setItem('user', JSON.stringify(user));
    setCurrentUser(user);
    setIsLoggedIn(true);
    await connectSocket(token);
  };

  // 4. Reset authentication profile and sever link
  const logout = async () => {
    if (socket) {
      stopHeartbeat();
      socket.disconnect();
      socketRef.current = null;
      setSocket(null);
    }
    await storage.removeItem('token');
    await storage.removeItem('user');
    setIsLoggedIn(false);
    setCurrentUser(null);
  };

  return (
    <SocketContext.Provider
      value={{
        socket,
        isConnected,
        isLoggedIn,
        isLoading,
        currentUser,
        telemetryLogs: appUsageLogs,
        addLog,
        login,
        logout
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useSystemSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSystemSocket must be used within a SocketProvider');
  }
  return context;
};
