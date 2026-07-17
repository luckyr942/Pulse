import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, StatusBar } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { SocketProvider, useSystemSocket } from '../context/socketContext';

export default function RootLayout() {
  return (
    <SocketProvider>
      <MainAppLayout />
    </SocketProvider>
  );
}

function MainAppLayout() {
  const { isLoading, isLoggedIn } = useSystemSocket();
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const segments = useSegments();
  const router = useRouter();

  // Authentication Redirect Flow
  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!isLoggedIn && !inAuthGroup) {
      // If not logged in and not in auth screen, redirect to login
      router.replace('/(auth)/login');
    } else if (isLoggedIn && inAuthGroup) {
      // If logged in and on login/register screens, redirect to tabs
      router.replace('/(tabs)');
    }
  }, [isLoggedIn, isLoading, segments]);

  useEffect(() => {
    if (isLoading) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.15,
            duration: 1500,
            useNativeDriver: true
          }),
          Animated.timing(pulseAnim, {
            toValue: 1.0,
            duration: 1500,
            useNativeDriver: true
          })
        ])
      ).start();
    }
  }, [isLoading]);

  if (isLoading) {
    return (
      <View style={styles.splashContainer}>
        {/* Constellation Star Background Effects */}
        <View style={[styles.star, { top: '10%', left: '15%' }]} />
        <View style={[styles.star, { top: '25%', right: '20%' }]} />
        <View style={[styles.star, { bottom: '30%', left: '10%' }]} />
        <View style={[styles.star, { bottom: '15%', right: '12%' }]} />
        <View style={[styles.star, { top: '45%', left: '80%', opacity: 0.8 }]} />

        {/* Concentric Radar Circles Container */}
        <View style={styles.radarContainer}>
          <Animated.View style={[styles.radarWaveOuter, { transform: [{ scale: pulseAnim }] }]} />
          <Animated.View style={[styles.radarWaveInner, { transform: [{ scale: pulseAnim }] }]} />
          <View style={styles.centralOrb} />
        </View>

        {/* Brand Text */}
        <Text style={styles.splashTitle}>Pulse</Text>
        <Text style={styles.splashSubtitle}>Real-time chat, reimagined.</Text>

        <StatusBar barStyle="light-content" backgroundColor="#080B13" />
      </View>
    );
  }

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)/login" />
        <Stack.Screen name="(tabs)" />
      </Stack>
      <StatusBar barStyle="dark-content" />
    </>
  );
}

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    backgroundColor: '#080B13',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  star: { position: 'absolute', width: 3, height: 3, borderRadius: 1.5, backgroundColor: '#FFFFFF', opacity: 0.35 },
  radarContainer: { width: 240, height: 240, justifyContent: 'center', alignItems: 'center', position: 'relative', marginBottom: 20 },
  radarWaveOuter: { position: 'absolute', width: 200, height: 200, borderRadius: 100, borderWidth: 1.5, borderColor: 'rgba(109, 131, 255, 0.12)', backgroundColor: 'rgba(109, 131, 255, 0.02)' },
  radarWaveInner: { position: 'absolute', width: 150, height: 150, borderRadius: 75, borderWidth: 1.5, borderColor: 'rgba(109, 131, 255, 0.25)', backgroundColor: 'rgba(109, 131, 255, 0.04)' },
  centralOrb: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#6D83FF', shadowColor: '#6D83FF', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.6, shadowRadius: 20, elevation: 15 },
  splashTitle: { fontSize: 32, fontWeight: '800', color: '#FFFFFF', letterSpacing: 0.5 },
  splashSubtitle: { fontSize: 15, color: '#8E9AA8', marginTop: 8 }
});
