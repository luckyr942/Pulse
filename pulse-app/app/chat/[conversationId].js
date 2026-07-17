import React, { useEffect, useRef, useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { BACKEND_URL } from "@/config";
import { useSystemSocket } from "@/context/socketContext";
import { storage } from "@/utils/storage";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function ChatScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { socket, currentUser } = useSystemSocket();
  const insets = useSafeAreaInsets();

  const conversationId = Array.isArray(params.conversationId)
    ? params.conversationId[0]
    : params.conversationId;
  const initialRecipientId = Array.isArray(params.recipientId)
    ? params.recipientId[0]
    : params.recipientId;
  const initialChatName = Array.isArray(params.name) ? params.name[0] : params.name;

  const [activeRecipientId, setActiveRecipientId] = useState(initialRecipientId);
  const [activeChatName, setActiveChatName] = useState(initialChatName);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [typing, setTyping] = useState(false);
  const typingTimeoutRef = useRef(null);
  const flatListRef = useRef(null);

  useEffect(() => {
    if (conversationId) {
      loadMessages(conversationId);
      // Resolve recipient if it wasn't passed in the navigation params
      if (!activeRecipientId) {
        resolveRecipient(conversationId);
      }
    }
  }, [conversationId]);

  useEffect(() => {
    // If recipient ID updates in params, sync it
    if (initialRecipientId && initialRecipientId !== activeRecipientId) {
      setActiveRecipientId(initialRecipientId);
    }
    if (initialChatName && initialChatName !== activeChatName) {
      setActiveChatName(initialChatName);
    }
  }, [initialRecipientId, initialChatName]);

  useEffect(() => {
    if (!socket || !conversationId) return;

    const handleReceiveMessage = (message) => {
      if (message.conversationId === conversationId) {
        setMessages((prev) => {
          const messageKey = message._id || message.idempotencyKey;
          if (messageKey && prev.some((item) => (item._id || item.idempotencyKey) === messageKey)) {
            return prev;
          }
          return [...prev, message];
        });
      }
    };

    const handleTyping = (payload) => {
      if (payload.conversationId !== conversationId) return;

      setTyping(true);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      typingTimeoutRef.current = setTimeout(() => setTyping(false), 2000);
    };

    socket.on("receive_message", handleReceiveMessage);
    socket.on("user_typing", handleTyping);

    return () => {
      socket.off("receive_message", handleReceiveMessage);
      socket.off("user_typing", handleTyping);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [socket, conversationId]);

  const resolveRecipient = async (activeConversationId) => {
    try {
      const token = await storage.getItem("token");
      const res = await fetch(`${BACKEND_URL}/api/conversations`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const result = await res.json();
      if (result.success) {
        const conv = result.data.find(c => c._id === activeConversationId);
        if (conv) {
          const otherUser = conv.participants.find(p => {
            const pId = (p && typeof p === 'object') ? (p._id || p.id) : p;
            const currentUserId = currentUser?._id || currentUser?.id;
            return pId !== currentUserId;
          });
          if (otherUser) {
            setActiveRecipientId(typeof otherUser === 'object' ? (otherUser._id || otherUser.id) : otherUser);
            setActiveChatName(typeof otherUser === 'object' ? (otherUser.userName || 'Chat') : 'Chat');
          }
        }
      }
    } catch (e) {
      console.warn("Failed to resolve recipient ID", e);
    }
  };

  const loadMessages = async (activeConversationId) => {
    try {
      const token = await storage.getItem("token");
      const res = await fetch(`${BACKEND_URL}/api/conversations/${activeConversationId}/messages`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const result = await res.json();

      if (result.success) {
        setMessages(result.data || []);
      }
    } catch (error) {
      console.warn("Failed to load message history", error);
    }
  };

  const emitTyping = () => {
    if (!socket || !conversationId || !activeRecipientId) return;

    socket.emit("user_typing", {
      recipientId: activeRecipientId,
      conversationId,
    });
  };

  const sendMessage = () => {
    if (!text.trim() || !socket || !conversationId || !activeRecipientId) return;

    const idempotencyKey = `${Date.now()}-${Math.random()}`;
    const content = text.trim();
    const optimisticMessage = {
      conversationId,
      senderId: currentUser?._id || currentUser?.id,
      content,
      createdAt: new Date().toISOString(),
      idempotencyKey,
    };

    setMessages((prev) => [...prev, optimisticMessage]);
    setText("");

    socket.emit(
      "send_message",
      {
        conversationId,
        recipientId: activeRecipientId,
        content,
        messageType: "text",
        idempotencyKey,
      },
      (ack) => {
        if (ack?.success && ack.message) {
          setMessages((prev) =>
            prev.map((message) =>
              message.idempotencyKey === idempotencyKey ? ack.message : message
            )
          );
        }

        if (ack?.error) {
          console.warn("Message send failed", ack.error);
        }
      }
    );
  };

  const renderMessage = ({ item }) => {
    const senderObj = item.sender;
    const senderId = (senderObj && typeof senderObj === "object")
      ? (senderObj._id || senderObj.id)
      : (item.senderId || senderObj);
    const mine = senderId === currentUser?._id || senderId === currentUser?.id;
    const timeLabel = item.createdAt
      ? new Date(item.createdAt).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })
      : "";

    return (
      <View style={[styles.messageBubbleContainer, mine ? styles.myBubbleContainer : styles.theirBubbleContainer]}>
        <View style={[styles.messageBubble, mine ? styles.myBubble : styles.theirBubble]}>
          <Text style={[styles.messageText, mine && styles.myMessageText]}>{item.content}</Text>
          {!!timeLabel && (
            <Text style={[styles.timeText, mine && styles.myTimeText]}>{timeLabel}</Text>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header Container with Safe Area Insets */}
      <View style={[styles.headerContainer, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
            <Ionicons name="chevron-back" size={24} color="#0F172A" />
          </TouchableOpacity>

          <View style={styles.headerInfo}>
            <Text style={styles.name}>{activeChatName || "Chat"}</Text>
            <View style={styles.statusRow}>
              <View style={[styles.statusIndicatorDot, { backgroundColor: '#10B981' }]} />
              <Text style={styles.status}>{typing ? "typing..." : "Online"}</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.headerButton}>
            <Ionicons name="call" size={18} color="#4F46E5" />
          </TouchableOpacity>
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item, index) => item._id || item.idempotencyKey || `${index}`}
          renderItem={renderMessage}
          contentContainerStyle={styles.list}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          showsVerticalScrollIndicator={false}
        />

        {typing && <Text style={styles.typingText}>typing...</Text>}

        {/* Input Bar */}
        <View style={[styles.inputRowContainer, { paddingBottom: Platform.OS === 'ios' ? Math.max(insets.bottom, 12) : 12 }]}>
          <View style={styles.inputRow}>
            <TouchableOpacity style={styles.inputAddButton}>
              <Ionicons name="add" size={22} color="#4F46E5" />
            </TouchableOpacity>

            <TextInput
              style={styles.input}
              placeholder="Type a message..."
              placeholderTextColor="#94A3B8"
              value={text}
              onChangeText={(value) => {
                setText(value);
                emitTyping();
              }}
              multiline={false}
            />

            <TouchableOpacity style={styles.sendButton} onPress={sendMessage}>
              <Ionicons name="send" size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: "#F8FAFC" // Soft Slate background for contrast
  },
  headerContainer: {
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 2,
  },
  header: {
    height: 60,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  headerButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
  },
  headerInfo: { 
    flex: 1,
    alignItems: "center",
  },
  name: { 
    fontSize: 16, 
    fontWeight: "800", 
    color: "#0F172A",
    letterSpacing: -0.2
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 2,
  },
  statusIndicatorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  status: { 
    fontSize: 11, 
    color: "#64748B",
    fontWeight: "600",
  },
  keyboardContainer: { 
    flex: 1 
  },
  list: { 
    padding: 16, 
    gap: 12 
  },
  messageBubbleContainer: {
    width: "100%",
    flexDirection: "row",
    marginVertical: 2,
  },
  myBubbleContainer: {
    justifyContent: "flex-end",
  },
  theirBubbleContainer: {
    justifyContent: "flex-start",
  },
  messageBubble: {
    maxWidth: "75%",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  myBubble: {
    backgroundColor: "#4F46E5", // Indigo Accent
    borderBottomRightRadius: 4,
  },
  theirBubble: {
    backgroundColor: "#FFFFFF", // Clean White
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  messageText: { 
    fontSize: 15, 
    lineHeight: 20,
    color: "#1E293B",
  },
  myMessageText: { 
    color: "#FFFFFF" 
  },
  timeText: { 
    fontSize: 9, 
    color: "#94A3B8", 
    marginTop: 4, 
    alignSelf: "flex-end" 
  },
  myTimeText: { 
    color: "rgba(255, 255, 255, 0.7)" 
  },
  typingText: { 
    paddingHorizontal: 20, 
    color: "#94A3B8", 
    fontSize: 12, 
    fontWeight: "500",
    marginBottom: 6 
  },
  inputRowContainer: {
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  inputAddButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
  },
  input: {
    flex: 1,
    backgroundColor: "#F1F5F9",
    borderRadius: 20,
    paddingHorizontal: 16,
    height: 38,
    fontSize: 14,
    color: "#1E293B",
  },
  sendButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#4F46E5",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#4F46E5",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
});
