import React, { useState, useEffect } from "react";
import {
  Text,
  View,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Modal,
  FlatList,
  Alert,
  Image
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from "@expo/vector-icons";
import { useSystemSocket } from "@/context/socketContext";
import { BACKEND_URL } from "@/config";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

// Mock profiles that map directly to MongoDB Seed Accounts for live demo
const MOCK_PROFILES = [
  {
    _id: 'mock_1',
    isMock: true,
    userName: 'Elena Vance',
    dbUserId: '6a500abb2109979c5eaaa39a', // Map to Alice
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80',
    snippet: 'The encryption keys for the Pr...',
    time: '2m ago',
    unreadCount: 3,
    online: true
  },
  {
    _id: 'mock_2',
    isMock: true,
    userName: 'Engineering Ops',
    dbUserId: '6a500abb2109979c5eaaa39b', // Map to Bob
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
    snippet: 'Marcus: Deployment successful ...',
    time: '15m ago',
    unreadCount: 0,
    online: false,
    hasCheck: true,
    checkColor: '#10B981', // green check
    isGroup: true,
    groupCount: '+12'
  },
  {
    _id: 'mock_3',
    isMock: true,
    userName: 'Julian Rossi',
    dbUserId: '6a500abb2109979c5eaaa39b', // Map to Bob
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80',
    snippet: "Let's review the analytics telem...",
    time: '1h ago',
    unreadCount: 0,
    online: false,
    hasDoubleCheck: true,
    checkColor: '#4F46E5' // double blue check
  },
  {
    _id: 'mock_4',
    isMock: true,
    userName: 'Sarah Jenkins',
    dbUserId: '6a500abb2109979c5eaaa39c', // Map to Charlie
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=150&q=80',
    snippet: 'End-to-end encrypted message',
    time: '3h ago',
    unreadCount: 0,
    online: false,
    isEncrypted: true
  },
  {
    _id: 'mock_5',
    isMock: true,
    userName: 'David Chen',
    dbUserId: '6a500abb2109979c5eaaa39c', // Map to Charlie
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=150&q=80',
    snippet: 'Attached is the file you requested.',
    time: 'Yesterday',
    unreadCount: 0,
    online: false
  }
];

export default function HomeScreen() {
  const router = useRouter();
  const { socket, isLoggedIn, currentUser, addLog } = useSystemSocket();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [onlineUsers, setOnlineUsers] = useState({});
  const [newChatModalVisible, setNewChatModalVisible] = useState(false);
  const [allUsers, setAllUsers] = useState([]);

  // Fetch active conversation list from database
  useEffect(() => {
    if (isLoggedIn) {
      fetchConversations();
    }
  }, [isLoggedIn]);

  // Handle live presence updates and message broadcasts
  useEffect(() => {
    if (!socket) return;
    
    socket.on('presence_update', ({ userId, status }) => {
      addLog('PRESENCE', `User ${userId} status changed to ${status}`);
      setOnlineUsers(prev => ({ ...prev, [userId]: status === 'online' }));
    });

    socket.on('receive_message', (message) => {
      addLog('RECEIVE_MESSAGE', `Incoming message from ${message.sender}`);
      fetchConversations();
    });

    return () => {
      socket.off('presence_update');
      socket.off('receive_message');
    };
  }, [socket]);

  const fetchConversations = async () => {
    try {
      const storedToken = await AsyncStorage.getItem('token');
      const res = await fetch(`${BACKEND_URL}/api/conversations`, {
        headers: { 'Authorization': `Bearer ${storedToken}` }
      });
      const result = await res.json();
      if (result.success) {
        setConversations(result.data);
      }
    } catch (err) {
      console.warn('Failed to load conversations list', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChat = (conv) => {
    router.push(`/chat/${conv._id}`);
  };

  const handleOpenNewChatModal = async () => {
    setNewChatModalVisible(true);
    const mockUsers = [
      { _id: '6a500abb2109979c5eaaa39a', userName: 'alice' },
      { _id: '6a500abb2109979c5eaaa39b', userName: 'bob' },
      { _id: '6a500abb2109979c5eaaa39c', userName: 'charlie' }
    ];
    setAllUsers(mockUsers.filter(u => u.userName !== currentUser?.userName));
  };

  const handleCreateConversation = async (recipientId) => {
    try {
      const storedToken = await AsyncStorage.getItem('token');
      const res = await fetch(`${BACKEND_URL}/api/conversations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${storedToken}`
        },
        body: JSON.stringify({ recipientId })
      });
      const result = await res.json();
      if (result.success) {
        setNewChatModalVisible(false);
        fetchConversations();
        handleOpenChat(result.data);
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to create conversation session');
    }
  };

  // Click handler that automatically links static mockup to database session
  const handleCardPress = (item) => {
    if (item.isMock) {
      // Find if we already have a conversation in database with the recipient
      const existingConv = conversations.find(c => 
        c.participants.some(p => p._id === item.dbUserId)
      );

      if (existingConv) {
        handleOpenChat(existingConv);
      } else {
        // Start a new session in database
        handleCreateConversation(item.dbUserId);
      }
    } else {
      handleOpenChat(item);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color="#4F46E5" />
      </View>
    );
  }

  // Merge live database conversations with static mockup layout rows
  const displayConversations = [...conversations];
  
  MOCK_PROFILES.forEach(mockItem => {
    const hasLiveSession = conversations.some(c => 
      c.participants.some(p => p._id === mockItem.dbUserId)
    );
    if (!hasLiveSession) {
      displayConversations.push(mockItem);
    }
  });

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <View style={styles.leftheader}>
          <Image
            source={{ uri: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80' }}
            style={styles.headerAvatar}
          />
          <Text style={styles.headerTitle}>Messages</Text>
        </View>
        <TouchableOpacity style={styles.searchIcon}>
          <Ionicons name="search-outline" size={24} color="#4F46E5" />
        </TouchableOpacity>
      </View>

      {/* Pill Filters */}
      <View style={styles.filterRow}>
        <TouchableOpacity style={[styles.filterPill, styles.filterPillActive]}>
          <Text style={styles.filterTextActive}>All</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.filterPill}>
          <Text style={styles.filterText}>Unread</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.filterPill}>
          <Text style={styles.filterText}>Groups</Text>
        </TouchableOpacity>
      </View>

      {/* Message Rows */}
      <FlatList
        data={displayConversations}
        keyExtractor={item => item._id}
        renderItem={({ item }) => {
          let name = '';
          let avatarUri = '';
          let snippet = '';
          let timeLabel = '2m ago';
          let isOnline = false;
          let unread = 0;
          let showGroupBadge = false;
          let groupText = '';
          let showCheck = false;
          let showDoubleCheck = false;
          let checkColor = '#6B7280';
          let showLock = false;

          if (item.isMock) {
            name = item.userName;
            avatarUri = item.avatar;
            snippet = item.snippet;
            timeLabel = item.time;
            isOnline = item.online;
            unread = item.unreadCount;
            showGroupBadge = item.isGroup || false;
            groupText = item.groupCount || '';
            showCheck = item.hasCheck || false;
            showDoubleCheck = item.hasDoubleCheck || false;
            checkColor = item.checkColor || '#6B7280';
            showLock = item.isEncrypted || false;
          } else {
            const partner = item.participants.find(p => p._id !== currentUser?.id) || { userName: 'User' };
            name = partner.userName;
            avatarUri = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80';
            snippet = item.lastMessage ? item.lastMessage.content : 'No messages yet';
            isOnline = onlineUsers[partner._id] || false;
          }

          return (
            <TouchableOpacity style={styles.rowCard} onPress={() => handleCardPress(item)}>
              {/* Profile Avatar with status dots */}
              <View style={styles.avatarContainer}>
                <Image source={{ uri: avatarUri }} style={styles.rowAvatar} />
                {isOnline && <View style={styles.onlineBadge} />}
                {showGroupBadge && (
                  <View style={styles.groupBadge}>
                    <Text style={styles.groupBadgeText}>{groupText}</Text>
                  </View>
                )}
              </View>

              {/* Text Area */}
              <View style={styles.messageContentArea}>
                <Text style={styles.rowName}>{name}</Text>
                
                <View style={styles.snippetRow}>
                  {showLock && (
                    <Ionicons name="lock-closed" size={12} color="#6B7280" style={styles.lockIcon} />
                  )}
                  {showCheck && (
                    <Ionicons name="checkmark" size={14} color={checkColor} style={styles.checkIcon} />
                  )}
                  {showDoubleCheck && (
                    <Ionicons name="checkmark-done" size={16} color={checkColor} style={styles.checkIcon} />
                  )}
                  <Text style={[styles.rowSnippet, showLock && styles.encryptedSnippet]} numberOfLines={1}>
                    {snippet}
                  </Text>
                </View>
              </View>

              {/* Badges / Time */}
              <View style={styles.rightContentColumn}>
                <Text style={styles.timeLabel}>{timeLabel}</Text>
                {unread > 0 && (
                  <View style={styles.unreadCountBadge}>
                    <Text style={styles.unreadBadgeText}>{unread}</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          );
        }}
      />

      {/* Floating Action Button (FAB) */}
      <TouchableOpacity style={styles.fab} onPress={handleOpenNewChatModal}>
        <Ionicons name="pencil" size={24} color="#FFFFFF" />
      </TouchableOpacity>

      {/* New Conversation Selector Modal */}
      <Modal visible={newChatModalVisible} animationType="slide">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setNewChatModalVisible(false)}>
              <Ionicons name="close" size={24} color="#111827" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>New Conversation</Text>
            <View style={{ width: 24 }} />
          </View>
          <FlatList
            data={allUsers}
            keyExtractor={item => item._id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.userSelectRow}
                onPress={() => handleCreateConversation(item._id)}
              >
                <View style={styles.avatarSelect}>
                  <Text style={styles.avatarSelectText}>{item.userName.charAt(0).toUpperCase()}</Text>
                </View>
                <Text style={styles.userSelectName}>{item.userName}</Text>
              </TouchableOpacity>
            )}
          />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  leftheader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#3B82F6', // Bold Indigo Title
    letterSpacing: 0.2,
  },
  searchIcon: {
    padding: 6,
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 8,
    marginBottom: 16,
  },
  filterPill: {
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
  },
  filterPillActive: {
    backgroundColor: '#4F46E5', // Indigo Active Pill
  },
  filterText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '600',
  },
  filterTextActive: {
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  rowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  avatarContainer: {
    position: 'relative',
    width: 52,
    height: 52,
  },
  rowAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  onlineBadge: {
    position: 'absolute',
    bottom: 1,
    right: 1,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#10B981', // Clean Emerald Green
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  groupBadge: {
    position: 'absolute',
    bottom: -2,
    right: -4,
    backgroundColor: '#93C5FD',
    borderRadius: 10,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  groupBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#1E3A8A',
  },
  messageContentArea: {
    flex: 1,
    marginLeft: 16,
  },
  rowName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  snippetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  rowSnippet: {
    fontSize: 13,
    color: '#6B7280',
    flex: 1,
  },
  encryptedSnippet: {
    fontStyle: 'italic',
    color: '#4B5563',
  },
  lockIcon: {
    marginRight: 4,
  },
  checkIcon: {
    marginRight: 4,
  },
  rightContentColumn: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 40,
    marginLeft: 10,
  },
  timeLabel: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '600',
  },
  unreadCountBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#4F46E5', // Indigo Active badge
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  unreadBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 54,
    height: 54,
    borderRadius: 16, // Rounded square feel FAB
    backgroundColor: '#4F46E5',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#111827',
  },
  userSelectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  avatarSelect: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EEF2F6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  avatarSelectText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#4F46E5',
  },
  userSelectName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginLeft: 16,
  }
});
