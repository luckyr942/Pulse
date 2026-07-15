import React, { useEffect, useState, useRef } from "react";
import { Text, View, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { BACKEND_URL } from "@/config";
import { storage } from "@/utils/storage";
import { useSystemSocket } from "@/context/socketContext";

export default function ChatScreen(){
    const router = useRouter();
    const {conversationId, recipientId} = useLocalSearchParams();
    const {socket, currentUser} = useSystemSocket();

    const [messages, setMessages] = useState([]);
    const [text, setText] = useState("");
    const [typing, setTyping] = useState(false);
    const flatListRef = useRef(null);

    useEffect(() => {
        if(!socket) return;

        const handleRecieveMessage = (message) =>{
            if(message.conversationId === conversationId){
                setMessages((prev) =>[...prev,message]);
            }
        };

        const handleTyping = (payload) =>{
            if(payload.conversationId === conversationId){
                setTyping(true);
                setTimeout(() => setTyping(false), 2000);
            }
        };

        socket.on("receive_message", handleRecieveMessage);
        socket.on("user_typing", handleTyping);

        return () =>{
            socket.off("receive_message", handleRecieveMessage);
            socket.off("user_typing", handleTyping);
        };

    }, [socket, conversationId]);

    const loadMessages = async () => {
        const token = await storage.getItem("token");

        const res = await fetch(`${BACKEND_URL}/api/messages/${conversationId}/messageges`,{
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        const result = await res.json();

        if(result.success){
            setMessages(result.data);
        }
    };

    const sendMessage = () =>{
        if(!text.trim() || !socket) return;

        const messagePayload = {
            conversationId,
            recipientId,
            content: text.trim(),
            messageType: "text",
            idempotencyKey: `${Date.now()}-${Math.random()}`,
        };


        socket.emit('send_message', messagePayload, (ack) => {
            if(ack?.success){
                sendMessages((prev) => [...prev, ack.message]);
                setText("");
            }
        });
    };

    const handleTyping = () =>{
        setText;
        if(!socket || !recipientId) return;

        socket.emit("user_typing", {
            recipientId,
            conversationId,
        });
    };

    const renderMessage = ({ item }) => {
        const mine = item.senderId === currentUser?._id || item.senderId?._id === currentUser?._id;

        return (
            <View style = {[styles]}
        )
    }


    
}

const styles.StyleSheet
