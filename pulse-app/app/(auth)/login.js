import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSystemSocket } from '../../context/socketContext';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BACKEND_URL, CONNECTION_HINT } from '../../config';

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useSystemSocket();
  const [isLoginView, setIsLoginView] = useState(true);

  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);

  const handleSubmit = async () => {
    if (!username.trim() || !password.trim()) {
      Alert.alert('Error', 'Username and Password fields are required');
      return;
    }

    if (!isLoginView && !agreeTerms) {
      Alert.alert('Terms', 'You must agree to the Terms of Service and Privacy Policy');
      return;
    }

    const endpoint = isLoginView ? '/api/auth/login' : '/api/auth/register';
    const payload = isLoginView 
      ? { username, password }
      : { username, password, fullName, email };

    try {
      const res = await fetch(`${BACKEND_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const result = await res.json();

      if (!result.success) {
        Alert.alert('Auth Failed', result.message || 'Verification rejected');
        return;
      }

      await login(result.data.token, result.data.user);
      router.replace('/(tabs)');

    } catch (error) {
      console.warn('Pulse backend connection failed', {
        url: `${BACKEND_URL}${endpoint}`,
        error
      });
      Alert.alert(
        'Network Error',
        `Unable to establish connection to Pulse server.\n\nTrying: ${BACKEND_URL}\n${CONNECTION_HINT}`
      );
    }
  };


  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <View style={styles.boltIconContainer}>
            <Ionicons name="flash" size={24} color="#FFFFFF" />
          </View>

          <Text style={styles.title}>
            {isLoginView ? 'Welcome back' : 'Create Account'}
          </Text>
          <Text style={styles.subtitle}>
            {isLoginView 
              ? 'The secure way to stay connected.' 
              : 'Join Pulse for a secure messaging experience.'}
          </Text>

          {isLoginView ? (
            <View style={styles.formContainer}>
              <TouchableOpacity style={styles.socialBtn}>
                <Ionicons name="logo-apple" size={18} color="#111827" />
                <Text style={styles.socialBtnText}>Continue with Apple</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.socialBtn}>
                <Ionicons name="logo-google" size={16} color="#111827" />
                <Text style={styles.socialBtnText}>Continue with Google</Text>
              </TouchableOpacity>

              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>OR</Text>
                <View style={styles.dividerLine} />
              </View>

              <Text style={styles.label}>username</Text>
              <TextInput
                style={styles.input}
                placeholder="johndoe_88"
                placeholderTextColor="#9CA3AF"
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
              />

              <View style={styles.labelRow}>
                <Text style={styles.label}>password</Text>
                <TouchableOpacity>
                  <Text style={styles.forgotPasswordText}>Forgot password?</Text>
                </TouchableOpacity>
              </View>
              <TextInput
                style={styles.input}
                placeholder="••••••••"
                placeholderTextColor="#9CA3AF"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />

              <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit}>
                <Text style={styles.submitBtnText}>Login →</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.toggleViewBtn} onPress={() => setIsLoginView(false)}>
                <Text style={styles.toggleText}>
                  Don&apos;t have an account? <Text style={styles.highlightText}>Sign up</Text>
                </Text>
              </TouchableOpacity>

              <Text style={styles.footerNote}>
                🔒 Secure end-to-end encryption active
              </Text>
            </View>
          ) : (
            <View style={styles.formContainer}>
              <Text style={styles.label}>Full Name</Text>
              <TextInput
                style={styles.input}
                placeholder="John Doe"
                placeholderTextColor="#9CA3AF"
                value={fullName}
                onChangeText={setFullName}
              />

              <Text style={styles.label}>username</Text>
              <TextInput
                style={styles.input}
                placeholder="johndoe_88"
                placeholderTextColor="#9CA3AF"
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
              />

              <Text style={styles.label}>Email ID</Text>
              <TextInput
                style={styles.input}
                placeholder="john@example.com"
                placeholderTextColor="#9CA3AF"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <Text style={styles.label}>password</Text>
              <TextInput
                style={styles.input}
                placeholder="••••••••"
                placeholderTextColor="#9CA3AF"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />

              <TouchableOpacity 
                style={styles.checkboxRow} 
                onPress={() => setAgreeTerms(!agreeTerms)}
              >
                <View style={[styles.checkbox, agreeTerms && styles.checkboxChecked]}>
                  {agreeTerms && <Ionicons name="checkmark" size={12} color="#FFFFFF" />}
                </View>
                <Text style={styles.checkboxLabel}>
                  I agree to the <Text style={styles.linkText}>Terms of Service</Text> and <Text style={styles.linkText}>Privacy Policy</Text>.
                </Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit}>
                <Text style={styles.submitBtnText}>Create Account →</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.toggleViewBtn} onPress={() => setIsLoginView(true)}>
                <Text style={styles.toggleText}>
                  Already have an account? <Text style={styles.highlightText}>Sign In</Text>
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  scrollContainer: { paddingHorizontal: 24, paddingTop: 40, paddingBottom: 20, alignItems: 'center' },
  boltIconContainer: {
    width: 44, height: 44, borderRadius: 14, backgroundColor: '#4F46E5',
    justifyContent: 'center', alignItems: 'center', shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4, marginBottom: 20
  },
  title: { fontSize: 24, fontWeight: '800', color: '#111827', textAlign: 'center', marginBottom: 6 },
  subtitle: { fontSize: 14, color: '#6B7280', textAlign: 'center', marginBottom: 30, paddingHorizontal: 10 },
  formContainer: { width: '100%' },
  socialBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#F3F4F6', padding: 14, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: '#E5E7EB'
  },
  socialBtnText: { fontSize: 14, fontWeight: '600', color: '#111827' },
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 18, gap: 10 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#E5E7EB' },
  dividerText: { fontSize: 12, fontWeight: '700', color: '#9CA3AF', letterSpacing: 1 },
  label: { fontSize: 10, fontWeight: '800', color: '#9CA3AF', letterSpacing: 1, marginBottom: 6, marginTop: 10 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  forgotPasswordText: { fontSize: 10, fontWeight: '700', color: '#4F46E5' },
  input: { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', padding: 14, borderRadius: 12, fontSize: 15, color: '#111827', marginBottom: 12 },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10, marginBottom: 20, gap: 10 },
  checkbox: { width: 18, height: 18, borderRadius: 4, borderWidth: 1, borderColor: '#D1D5DB', justifyContent: 'center', alignItems: 'center' },
  checkboxChecked: { backgroundColor: '#4F46E5', borderColor: '#4F46E5' },
  checkboxLabel: { fontSize: 11, color: '#6B7280', lineHeight: 16 },
  linkText: { color: '#4F46E5', fontWeight: '600' },
  submitBtn: {
    backgroundColor: '#4F46E5', padding: 15, borderRadius: 12, alignItems: 'center', marginTop: 10,
    shadowColor: '#4F46E5', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 10, elevation: 3
  },
  submitBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  toggleViewBtn: { marginTop: 20, alignItems: 'center' },
  toggleText: { fontSize: 13, color: '#6B7280' },
  highlightText: { color: '#4F46E5', fontWeight: '700' },
  footerNote: { fontSize: 11, color: '#9CA3AF', textAlign: 'center', marginTop: 40 }
});
