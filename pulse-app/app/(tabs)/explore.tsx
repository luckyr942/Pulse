import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Platform
} from 'react-native';
import { useSystemSocket } from '../../context/socketContext';
import { BACKEND_URL } from '../../config';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function TelemetryScreen() {
  const { isConnected, telemetryLogs, socket, addLog } = useSystemSocket();

  const handleSimulateCrash = () => {
    if (socket && socket.connected) {
      socket.disconnect();
      addLog('SIMULATE_CRASH', 'Client manually cut network connection.');
    }
  };

  const handleRecoverNode = () => {
    if (socket && !socket.connected) {
      socket.connect();
      addLog('RECOVER_NODE', 'Re-initiating socket handshake gateway...');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>System Telemetry</Text>
          <Text style={styles.subtitle}>Distributed Cluster Analytics Node</Text>
        </View>

        {/* Port & State Grid */}
        <View style={styles.metricsGrid}>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>ACTIVE GATEWAY NODE</Text>
            <Text style={[styles.metricValue, styles.textOrange]}>
              {BACKEND_URL.replace(/^https?:\/\//, '')}
            </Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>WEBSOCKET STATE</Text>
            <Text style={[styles.metricValue, isConnected ? styles.textCyan : styles.textDanger]}>
              {isConnected ? '🟢 ONLINE' : '🔴 OFFLINE'}
            </Text>
          </View>
        </View>

        {/* Outage Toggles */}
        <View style={styles.consoleBox}>
          <Text style={styles.boxTitle}>Infrastructure Disruption Simulator</Text>
          <Text style={styles.metaText}>
            Manually sever the stateful connection to force the cluster Ingress to redirect traffic and trigger RabbitMQ notifications.
          </Text>
          <View style={styles.buttonRow}>
            {isConnected ? (
              <TouchableOpacity style={[styles.btn, styles.btnWarn]} onPress={handleSimulateCrash}>
                <Text style={styles.btnText}>Simulate Server Crash</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={[styles.btn, styles.btnSuccess]} onPress={handleRecoverNode}>
                <Text style={styles.btnText}>Recover Node Gateway</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Live Logs Terminal */}
        <View style={styles.consoleBox}>
          <Text style={styles.boxTitle}>Live Client Event Stream Logs</Text>
          <View style={styles.terminalContainer}>
            {telemetryLogs.map((log, index) => (
              <Text key={index} style={styles.logText}>{log}</Text>
            ))}
            {telemetryLogs.length === 0 && (
              <Text style={styles.emptyLogText}>Terminal listening for WS frames...</Text>
            )}
          </View>
        </View>

        {/* Vital Topologies */}
        <View style={styles.consoleBox}>
          <Text style={styles.boxTitle}>Data Pipeline Vitals</Text>
          <View style={styles.vitalRow}>
            <Text style={styles.vitalLabel}>Write-Behind persistence queue (RabbitMQ)</Text>
            <Text style={styles.badgeTextActive}>ACTIVE</Text>
          </View>
          <View style={styles.vitalRow}>
            <Text style={styles.vitalLabel}>Inter-server presence events (Redis PubSub)</Text>
            <Text style={styles.badgeTextActive}>ACTIVE</Text>
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  scrollContainer: { padding: 24 },
  header: { marginBottom: 20 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#111827' },
  subtitle: { fontSize: 13, color: '#6B7280', marginTop: 4 },
  metricsGrid: { flexDirection: 'row', gap: 15, marginBottom: 20 },
  metricCard: { flex: 1, backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, padding: 16 },
  metricLabel: { fontSize: 10, fontWeight: '800', color: '#9CA3AF', letterSpacing: 1, marginBottom: 6 },
  metricValue: { fontSize: 15, fontWeight: '700' },
  textOrange: { color: '#4F46E5' },
  textCyan: { color: '#10B981' },
  textDanger: { color: '#EF4444' },
  consoleBox: { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, padding: 20, marginBottom: 16 },
  boxTitle: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 6 },
  metaText: { fontSize: 12, color: '#6B7280', marginBottom: 16, lineHeight: 18 },
  buttonRow: { flexDirection: 'row', gap: 12 },
  btn: { flex: 1, padding: 14, borderRadius: 10, alignItems: 'center' },
  btnWarn: { backgroundColor: 'rgba(239, 68, 68, 0.1)', borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.2)' },
  btnSuccess: { backgroundColor: 'rgba(16, 185, 129, 0.1)', borderWidth: 1, borderColor: 'rgba(16, 185, 129, 0.2)' },
  btnText: { color: '#111827', fontWeight: '700', fontSize: 13 },
  terminalContainer: { backgroundColor: '#111827', borderRadius: 8, padding: 14, minHeight: 150 },
  logText: { fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', color: '#10B981', fontSize: 11, marginBottom: 4 },
  emptyLogText: { color: '#6B7280', fontSize: 12, textAlign: 'center', marginTop: 50 },
  vitalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 },
  vitalLabel: { fontSize: 12, color: '#6B7280', flex: 1 },
  badgeTextActive: { fontSize: 11, fontWeight: '800', color: '#10B981', letterSpacing: 0.5 }
});
