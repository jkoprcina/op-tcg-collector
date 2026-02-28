import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { getTheme } from '../theme';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components';
import { useTheme } from '../context/ThemeContext';
import type { RootStackParamList } from '../navigation';

type RegisterRouteName = 'Register' | 'register';
export type RegisterScreenProps = NativeStackScreenProps<RootStackParamList, RegisterRouteName>;

export function RegisterScreen({ navigation }: RegisterScreenProps) {
  const { mode } = useTheme();
  const theme = getTheme(mode);
  const { register } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const toast = useToast();

  const onSubmit = async () => {
    setError('');
    setSuccess('');
    if (!email || !password || !confirm) {
      setError('All fields are required');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      await register(email.trim(), password);
      setSuccess('Account created successfully!');
      toast.show('Account created! Redirecting to login...', 'success', 3000);
      setEmail('');
      setPassword('');
      setConfirm('');
      // Redirect to login immediately
      setTimeout(() => {
        navigation.replace('Login');
      }, 1500);
    } catch (e: any) {
      const errorMsg = e?.message || 'Failed to register';
      setError(errorMsg);
      toast.show(errorMsg, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Text style={[styles.title, { color: theme.colors.text }]}>Create Account</Text>
      <Text style={[styles.subtitle, { color: theme.colors.mutedText }]}>Track your One Piece cards</Text>

      <TextInput
        style={[styles.input, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, color: theme.colors.text }]}
        placeholder="Email"
        placeholderTextColor={theme.colors.mutedText}
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <View style={styles.passwordContainer}>
        <TextInput
          style={[styles.passwordInput, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, color: theme.colors.text }]}
          placeholder="Password"
          placeholderTextColor={theme.colors.mutedText}
          secureTextEntry={!showPassword}
          value={password}
          onChangeText={setPassword}
        />
        <TouchableOpacity
          style={styles.eyeIcon}
          onPress={() => setShowPassword(!showPassword)}
        >
          <Ionicons
            name={showPassword ? 'eye-off-outline' : 'eye-outline'}
            size={20}
            color={theme.colors.mutedText}
          />
        </TouchableOpacity>
      </View>
      <View style={styles.passwordContainer}>
        <TextInput
          style={[styles.passwordInput, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, color: theme.colors.text }]}
          placeholder="Confirm Password"
          placeholderTextColor={theme.colors.mutedText}
          secureTextEntry={!showConfirm}
          value={confirm}
          onChangeText={setConfirm}
        />
        <TouchableOpacity
          style={styles.eyeIcon}
          onPress={() => setShowConfirm(!showConfirm)}
        >
          <Ionicons
            name={showConfirm ? 'eye-off-outline' : 'eye-outline'}
            size={20}
            color={theme.colors.mutedText}
          />
        </TouchableOpacity>
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {success ? <Text style={styles.success}>{success}</Text> : null}

      <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: theme.colors.primary }]} onPress={onSubmit} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>Register</Text>}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate('Login')} style={styles.linkBtn}>
        <Text style={[styles.linkText, { color: theme.colors.primary }]}>Already have an account? Login</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 20,
  },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
    fontSize: 14,
  },
  primaryBtn: {
    paddingVertical: 12,
    borderRadius: 12,
    minHeight: 48,
    alignItems: 'center',
    marginTop: 10,
  },
  primaryText: {
    color: '#fff',
    fontWeight: '700',
  },
  linkBtn: {
    marginTop: 14,
    alignItems: 'center',
  },
  linkText: {
    fontWeight: '600',
  },
  error: {
    color: '#c0392b',
    marginBottom: 10,
  },
  success: {
    marginBottom: 10,
    fontWeight: '500',
  },
  passwordContainer: {
    position: 'relative',
    marginBottom: 14,
  },
  passwordInput: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    paddingRight: 40,
    fontSize: 14,
  },
  eyeIcon: {
    position: 'absolute',
    right: 12,
    top: 12,
    padding: 4,
  },
});
