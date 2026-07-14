//handle authentication states, local storage tokens, and WebSocket events

import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import  AsyncStorage from '@react-native-async-storage/async-storage';
import { BACKEND_URL } from "../config";

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [appUsageLogs, setAppUsageLogs] = useState([]);

  // to append real-time logs to the Dev dashboard (utility)
  const addLog = (event, description) => {
    const time = new Date().toLocaleTimeString();
    setAppUsageLogs(prev => [`[${time}] ${event}: ${description}`, ...prev].slice(0, 40));
  };

  // async storage for session check
  useEffect(() => {
    const checkSession = async () => {
      try {
        const storedToken = await AsyncStorage.getItem('token');
        const storedUser = await AsyncStorage.getItem('user');

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
  }, []);

  // 2. Open stateful full-duplex WebSocket pipe
  const connectSocket = async (authToken) => {
    if (socket) return; // prevent duplicate socket connect

    const socketInstance = io(BACKEND_URL, {
      auth: { token: authToken },
      transports: ['websocket'],
      forceNew: true,
    });

    socketInstance.on('connect', () => {
      setIsConnected(true);
      addLog('CONNECT', `Linked to gateway. Socket ID: ${socketInstance.id}`);
    });

    socketInstance.on('disconnect', (reason) => {
      setIsConnected(false);
      addLog('DISCONNECT', `Server disconnected: ${reason}`);
    });

    setSocket(socketInstance);
  };

  // Handle execution on successful HTTP validation login 
  const login = async (token, user) => {
    await AsyncStorage.setItem('token', token);
    await AsyncStorage.setItem('user', JSON.stringify(user));
    setCurrentUser(user);
    setIsLoggedIn(true);
    await connectSocket(token);
  };

  // 4. Reset authentication profile and sever link
  const logout = async () => {
    if (socket) {
      socket.disconnect();
      setSocket(null);
    }
    await AsyncStorage.removeItem('token');
    await AsyncStorage.removeItem('user');
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