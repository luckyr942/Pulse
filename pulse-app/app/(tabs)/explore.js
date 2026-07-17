import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Platform,
  StatusBar
} from 'react-native';
import { useSystemSocket } from '../../context/socketContext';
import { BACKEND_URL } from '../../config';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from "@expo/vector-icons";

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

  const formatLogLine = (log) => {
    // Colorize logs based on type
    if (log.includes('CONNECT')) {
      return { text: log, color: '#10B981' }; // Emerald Green
    } else if (log.includes('DISCONNECT') || log.includes('ERROR')) {
      return { text: log, color: '#EF4444' }; // Red
    } else if (log.includes('RECEIVE_MESSAGE') || log.includes('SEND')) {
      return { text: log, color: '#38BDF8' }; // Light Blue
    } else if (log.includes('PRESENCE')) {
      return { text: log, color: '#A855F7' }; // Purple
    }
    return { text: log, color: '#94A3B8' }; // Slate Gray
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0B0F19" />
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTitleRow}>
            <Ionicons name="pulse" size={26} color="#6366F1" style={styles.headerIcon} />
            <Text style={styles.headerTitle}>Pulse Analytics Node</Text>
          </View>
          <Text style={styles.subtitle}>Cluster Topology & Real-time Live Observer</Text>
        </View>

        {/* Port & State Grid */}
        <View style={styles.metricsGrid}>
          <View style={styles.metricCard}>
            <View style={styles.metricHeaderRow}>
              <Ionicons name="server-outline" size={14} color="#94A3B8" />
              <Text style={styles.metricLabel}>ACTIVE GATEWAY</Text>
            </View>
            <Text style={styles.metricValue}>
              {BACKEND_URL.replace(/^https?:\/\//, '')}
            </Text>
          </View>
          
          <View style={[styles.metricCard, isConnected ? styles.cardBorderGreen : styles.cardBorderRed]}>
            <View style={styles.metricHeaderRow}>
              <Ionicons name="wifi-outline" size={14} color={isConnected ? '#10B981' : '#EF4444'} />
              <Text style={[styles.metricLabel, isConnected ? styles.textGreen : styles.textDanger]}>GATEWAY STATE</Text>
            </View>
            <Text style={[styles.metricValue, isConnected ? styles.textGreen : styles.textDanger]}>
              {isConnected ? 'ONLINE' : 'OFFLINE'}
            </Text>
          </View>
        </View>

        {/* Outage Toggles */}
        <View style={styles.consoleBox}>
          <View style={styles.boxHeader}>
            <Ionicons name="construct-outline" size={18} color="#818CF8" />
            <Text style={styles.boxTitle}>Cluster Disruption Sim</Text>
          </View>
          <Text style={styles.metaText}>
            Manually sever the WS transport pipe. This forces the client to buffer outgoing state and routes offline message delivery tasks to RabbitMQ.
          </Text>
          <View style={styles.buttonRow}>
            {isConnected ? (
              <TouchableOpacity style={[styles.btn, styles.btnWarn]} onPress={handleSimulateCrash}>
                <Ionicons name="flash-off" size={16} color="#EF4444" style={{ marginRight: 6 }} />
                <Text style={styles.btnTextWarn}>Sever Socket Conn</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={[styles.btn, styles.btnSuccess]} onPress={handleRecoverNode}>
                <Ionicons name="flash" size={16} color="#10B981" style={{ marginRight: 6 }} />
                <Text style={styles.btnTextSuccess}>Reconnect Node</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Live Logs Terminal */}
        <View style={styles.consoleBox}>
          <View style={styles.boxHeader}>
            <View style={styles.liveIndicatorContainer}>
              <View style={[styles.liveDot, isConnected && styles.liveDotActive]} />
              <Text style={styles.boxTitle}>Event Observer Console</Text>
            </View>
            <Text style={styles.terminalCount}>{telemetryLogs.length} events</Text>
          </View>
          <View style={styles.terminalContainer}>
            {telemetryLogs.map((log, index) => {
              const logDetail = formatLogLine(log);
              return (
                <Text key={index} style={[styles.logText, { color: logDetail.color }]}>
                  {logDetail.text}
                </Text>
              );
            })}
            {telemetryLogs.length === 0 && (
              <View style={styles.terminalEmpty}>
                <ActivityIndicator size="small" color="#4F46E5" style={{ marginBottom: 12 }} />
                <Text style={styles.emptyLogText}>Listening for inbound WS frames...</Text>
              </View>
            )}
          </View>
        </View>

        {/* Vital Topologies */}
        <View style={styles.consoleBox}>
          <View style={styles.boxHeader}>
            <Ionicons name="git-branch-outline" size={18} color="#34D399" />
            <Text style={styles.boxTitle}>Data Pipeline Vitals</Text>
          </View>
          
          <View style={styles.vitalRow}>
            <View style={styles.vitalLeft}>
              <View style={styles.vitalStatusDotGreen} />
              <Text style={styles.vitalLabel}>Write-Behind Persistence (RabbitMQ)</Text>
            </View>
            <Text style={styles.badgeTextActive}>ACTIVE</Text>
          </View>

          <View style={styles.vitalRow}>
            <View style={styles.vitalLeft}>
              <View style={styles.vitalStatusDotGreen} />
              <Text style={styles.vitalLabel}>Presence Sync Engine (Redis PubSub)</Text>
            </View>
            <Text style={styles.badgeTextActive}>ACTIVE</Text>
          </View>

          <View style={styles.vitalRow}>
            <View style={styles.vitalLeft}>
              <View style={styles.vitalStatusDotGreen} />
              <Text style={styles.vitalLabel}>Distributed Session Cache (Redis TTL)</Text>
            </View>
            <Text style={styles.badgeTextActive}>ACTIVE</Text>
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#0B0F19' // Dark ops room background
  },
  scrollContainer: { 
    padding: 20 
  },
  header: { 
    marginBottom: 24,
    marginTop: 8
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  headerIcon: {
    marginRight: 8,
  },
  headerTitle: { 
    fontSize: 24, 
    fontWeight: '900', 
    color: '#F8FAFC', // Slate White
    letterSpacing: -0.5
  },
  subtitle: { 
    fontSize: 13, 
    color: '#94A3B8', 
    marginTop: 4,
    fontWeight: '500'
  },
  metricsGrid: { 
    flexDirection: 'row', 
    gap: 12, 
    marginBottom: 20 
  },
  metricCard: { 
    flex: 1, 
    backgroundColor: '#1E293B', // Slate Card
    borderWidth: 1, 
    borderColor: '#334155', 
    borderRadius: 16, 
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 3,
  },
  cardBorderGreen: {
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  cardBorderRed: {
    borderColor: 'rgba(239, 110, 110, 0.3)',
  },
  metricHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  metricLabel: { 
    fontSize: 9, 
    fontWeight: '800', 
    color: '#94A3B8', 
    letterSpacing: 0.8
  },
  metricValue: { 
    fontSize: 16, 
    fontWeight: '800',
    color: '#F1F5F9'
  },
  textGreen: { 
    color: '#10B981' 
  },
  textDanger: { 
    color: '#EF4444' 
  },
  consoleBox: { 
    backgroundColor: '#161B2C', // Deep Navy Card
    borderWidth: 1, 
    borderColor: '#242F41', 
    borderRadius: 16, 
    padding: 20, 
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 4,
  },
  boxHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  boxTitle: { 
    fontSize: 14, 
    fontWeight: '800', 
    color: '#F8FAFC', 
    marginLeft: 6,
  },
  liveIndicatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#64748B',
  },
  liveDotActive: {
    backgroundColor: '#10B981',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  terminalCount: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '700',
  },
  metaText: { 
    fontSize: 12, 
    color: '#94A3B8', 
    marginBottom: 16, 
    lineHeight: 18 
  },
  buttonRow: { 
    flexDirection: 'row' 
  },
  btn: { 
    flex: 1, 
    paddingVertical: 12, 
    paddingHorizontal: 16,
    borderRadius: 12, 
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  btnWarn: { 
    backgroundColor: 'rgba(239, 68, 68, 0.1)', 
    borderWidth: 1.2, 
    borderColor: 'rgba(239, 68, 68, 0.25)' 
  },
  btnSuccess: { 
    backgroundColor: 'rgba(16, 185, 129, 0.1)', 
    borderWidth: 1.2, 
    borderColor: 'rgba(16, 185, 129, 0.25)' 
  },
  btnTextWarn: { 
    color: '#EF4444', 
    fontWeight: '800', 
    fontSize: 13 
  },
  btnTextSuccess: { 
    color: '#10B981', 
    fontWeight: '800', 
    fontSize: 13 
  },
  terminalContainer: { 
    backgroundColor: '#070A13', // Black box terminal
    borderRadius: 12, 
    padding: 16, 
    minHeight: 160,
    maxHeight: 280,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  terminalEmpty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 40,
  },
  logText: { 
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace', 
    fontSize: 11, 
    marginBottom: 6,
    lineHeight: 15,
  },
  emptyLogText: { 
    color: '#475569', 
    fontSize: 12, 
    fontWeight: '600',
    textAlign: 'center' 
  },
  vitalRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginTop: 14,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B'
  },
  vitalLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  vitalStatusDotGreen: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  vitalLabel: { 
    fontSize: 12, 
    color: '#94A3B8',
    fontWeight: '500'
  },
  badgeTextActive: { 
    fontSize: 10, 
    fontWeight: '900', 
    color: '#10B981', 
    letterSpacing: 0.5 
  }
});
