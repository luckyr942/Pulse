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
  Image,
  Platform
} from 'react-native';
import { Ionicons } from "@expo/vector-icons";
import { useSystemSocket } from "@/context/socketContext";
import { BACKEND_URL } from "@/config";
import { storage } from "@/utils/storage";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
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
  const { socket, isLoggedIn, currentUser, addLog, logout } = useSystemSocket();
  const insets = useSafeAreaInsets();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [onlineUsers, setOnlineUsers] = useState({});
  const [newChatModalVisible, setNewChatModalVisible] = useState(false);
  const [allUsers, setAllUsers] = useState([]);

  const [activeFilter, setActiveFilter] = useState('All');

  const handleLogoutPress = () => {
    Alert.alert(
      "Confirm Logout",
      "Are you sure you want to log out of Pulse?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Log Out", style: "destructive", onPress: () => logout() }
      ]
    );
  };

  // Fetch active conversation list from database
  useEffect(() => {
    if (isLoggedIn) {
      fetchConversations();
    }
  }, [isLoggedIn]);

  // Handle live presence updates and message broadcasts
  useEffect(() => {
    if (!socket) return;
    
    const handlePresenceUpdate = ({ userId, status }) => {
      addLog('PRESENCE', `User ${userId} status changed to ${status}`);
      setOnlineUsers(prev => ({ ...prev, [userId]: status === 'online' }));
    };

    const handleReceiveMessage = (message) => {
      addLog('RECEIVE_MESSAGE', `Incoming message from ${message.senderId || message.sender}`);
      fetchConversations();
    };

    socket.on('presence_update', handlePresenceUpdate);
    socket.on('receive_message', handleReceiveMessage);

    return () => {
      socket.off('presence_update', handlePresenceUpdate);
      socket.off('receive_message', handleReceiveMessage);
    };
  }, [socket]);

  const fetchConversations = async () => {
    try {
      const storedToken = await storage.getItem('token');
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

  const handleOpenChat = (conversation) => {
    const otherUser = conversation.participants.find(p => {
      const pId = (p && typeof p === 'object') ? (p._id || p.id) : p;
      const currentUserId = currentUser?._id || currentUser?.id;
      return pId !== currentUserId;
    });
  
    const recipientId = (otherUser && typeof otherUser === 'object') ? (otherUser._id || otherUser.id) : otherUser;
    const recipientName = (otherUser && typeof otherUser === 'object') ? (otherUser.userName || 'Chat') : 'Chat';

    router.push({
      pathname: "/chat/[conversationId]",
      params: {
        conversationId: conversation._id,
        recipientId: recipientId,
        name: recipientName
      },
    });
  };

  const handleOpenNewChatModal = async () => {
    setNewChatModalVisible(true);
    try {
      const storedToken = await storage.getItem('token');
      const res = await fetch(`${BACKEND_URL}/api/users`, {
        headers: { 'Authorization': `Bearer ${storedToken}` }
      });
      const result = await res.json();
      if (result.success) {
        const currentUserId = currentUser?._id || currentUser?.id;
        setAllUsers(result.data.filter(u => (u._id || u.id) !== currentUserId));
      } else {
        // Fallback mock users if api fails
        const mockUsers = [
          { _id: '6a500abb2109979c5eaaa39a', userName: 'alice' },
          { _id: '6a500abb2109979c5eaaa39b', userName: 'bob' },
          { _id: '6a500abb2109979c5eaaa39c', userName: 'charlie' }
        ];
        setAllUsers(mockUsers.filter(u => u.userName !== currentUser?.userName));
      }
    } catch (e) {
      const mockUsers = [
        { _id: '6a500abb2109979c5eaaa39a', userName: 'alice' },
        { _id: '6a500abb2109979c5eaaa39b', userName: 'bob' },
        { _id: '6a500abb2109979c5eaaa39c', userName: 'charlie' }
      ];
      setAllUsers(mockUsers.filter(u => u.userName !== currentUser?.userName));
    }
  };

  const handleCreateConversation = async (recipientId) => {
    try {
      const storedToken = await storage.getItem('token');
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

  const getGradientColors = (id) => {
    // Generate beautiful distinct gradient colors based on string hash
    let hash = 0;
    const key = id || 'default';
    for (let i = 0; i < key.length; i++) {
      hash = key.charCodeAt(i) + ((hash << 5) - hash);
    }
    const h1 = Math.abs(hash % 360);
    const h2 = (h1 + 40) % 360;
    return [`hsl(${h1}, 75%, 65%)`, `hsl(${h2}, 85%, 50%)`];
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

  // Filter logic
  const filteredConversations = displayConversations.filter(item => {
    if (activeFilter === 'Unread') {
      return item.unreadCount > 0 || (item.isMock && item.unreadCount > 0);
    }
    if (activeFilter === 'Groups') {
      return item.isGroup || item.type === 'group';
    }
    return true;
  });

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <View style={styles.leftheader}>
          <TouchableOpacity style={styles.userProfileFrame} onPress={handleLogoutPress}>
            <Text style={styles.userProfileText}>
              {(currentUser?.userName || 'P').charAt(0).toUpperCase()}
            </Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Messages</Text>
        </View>
        <TouchableOpacity style={styles.searchIcon} onPress={handleOpenNewChatModal}>
          <Ionicons name="search-outline" size={22} color="#0F172A" />
        </TouchableOpacity>
      </View>

      {/* Pill Filters */}
      <View style={styles.filterRow}>
        {['All', 'Unread', 'Groups'].map(filterName => (
          <TouchableOpacity 
            key={filterName}
            style={[styles.filterPill, activeFilter === filterName && styles.filterPillActive]}
            onPress={() => setActiveFilter(filterName)}
          >
            <Text style={[styles.filterText, activeFilter === filterName && styles.filterTextActive]}>
              {filterName}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Message Rows */}
      <FlatList
        data={filteredConversations}
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
          const [colorStart, colorEnd] = getGradientColors(item._id);

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
            const currentUserId = currentUser?._id || currentUser?.id;
            const partner = item.participants.find(p => p._id !== currentUserId) || { userName: 'User' };
            name = partner.userName;
            snippet = item.lastMessage ? (item.lastMessage.content || 'Message') : 'No messages yet';
            isOnline = onlineUsers[partner._id] || false;
            unread = item.unreadCount || 0;
            
            // Format updatedAt time label
            if (item.updatedAt) {
              const date = new Date(item.updatedAt);
              timeLabel = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            }
          }

          return (
            <TouchableOpacity style={styles.rowCard} onPress={() => handleCardPress(item)}>
              {/* Profile Avatar with status dots */}
              <View style={styles.avatarContainer}>
                {avatarUri ? (
                  <Image source={{ uri: avatarUri }} style={styles.rowAvatar} />
                ) : (
                  <View style={[styles.rowAvatarFallback, { backgroundColor: colorStart }]}>
                    <Text style={styles.rowAvatarFallbackText}>{name.charAt(0).toUpperCase()}</Text>
                  </View>
                )}
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
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="chatbubbles-outline" size={48} color="#9CA3AF" />
            <Text style={styles.emptyText}>No conversations found</Text>
          </View>
        }
      />

      {/* Floating Action Button (FAB) */}
      <TouchableOpacity style={styles.fab} onPress={handleOpenNewChatModal}>
        <Ionicons name="pencil" size={22} color="#FFFFFF" />
      </TouchableOpacity>

      {/* New Conversation Selector Modal */}
      <Modal visible={newChatModalVisible} animationType="slide">
        <View style={styles.modalContainer}>
          <View style={[styles.modalHeader, { paddingTop: Platform.OS === 'ios' ? insets.top : 16 }]}>
            <TouchableOpacity onPress={() => setNewChatModalVisible(false)}>
              <Ionicons name="close" size={24} color="#111827" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>New Conversation</Text>
            <View style={{ width: 24 }} />
          </View>
          <FlatList
            data={allUsers}
            keyExtractor={item => item._id || item.id}
            renderItem={({ item }) => {
              const [colorStart] = getGradientColors(item._id || item.id);
              return (
                <TouchableOpacity
                  style={styles.userSelectRow}
                  onPress={() => handleCreateConversation(item._id || item.id)}
                >
                  <View style={[styles.avatarSelect, { backgroundColor: colorStart }]}>
                    <Text style={styles.avatarSelectText}>{(item.userName || 'U').charAt(0).toUpperCase()}</Text>
                  </View>
                  <Text style={styles.userSelectName}>{item.userName}</Text>
                </TouchableOpacity>
              );
            }}
          />
        </View>
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
    fontSize: 24,
    fontWeight: '900',
    color: '#0F172A', // Sleek Charcoal
    letterSpacing: -0.3,
  },
  userProfileFrame: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#EEF2F6',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userProfileText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#4F46E5',
  },
  rowAvatarFallback: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  rowAvatarFallbackText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
    fontWeight: '600',
  },
  searchIcon: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
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
    backgroundColor: '#F1F5F9',
  },
  filterPillActive: {
    backgroundColor: '#4F46E5', // Indigo Active Pill
  },
  filterText: {
    fontSize: 13,
    color: '#64748B',
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
    borderBottomColor: '#F1F5F9',
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
    borderColor: '#E2E8F0',
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
    color: '#1E293B',
  },
  snippetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  rowSnippet: {
    fontSize: 13,
    color: '#64748B',
    flex: 1,
  },
  encryptedSnippet: {
    fontStyle: 'italic',
    color: '#475569',
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
    color: '#94A3B8',
    fontWeight: '600',
  },
  unreadCountBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#10B981', // Emerald green badge
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
    borderBottomColor: '#F1F5F9',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  userSelectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  avatarSelect: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  avatarSelectText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  userSelectName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
    marginLeft: 16,
  }
});
