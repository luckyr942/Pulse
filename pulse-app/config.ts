import Constants from 'expo-constants';
import { Platform } from 'react-native';

const normalizeUrl = (url: string) => url.replace(/\/+$/, '');

const configuredBackendUrl = process.env.EXPO_PUBLIC_BACKEND_URL;
const expoDevHost = Constants.expoConfig?.hostUri?.split(':')[0];

const fallbackBackendUrl =
  expoDevHost
    ? `http://${expoDevHost}:3001`
    : Platform.select({
        android: 'http://10.0.2.2:3001',
        default: 'http://localhost:3001',
      }) || 'http://localhost:3001';

export const BACKEND_URL = normalizeUrl(configuredBackendUrl || fallbackBackendUrl);
export const CONNECTION_HINT = configuredBackendUrl
  ? 'Check that EXPO_PUBLIC_BACKEND_URL is reachable from this device.'
  : 'Start the backend on port 3001 and keep this device on the same network as Expo.';
