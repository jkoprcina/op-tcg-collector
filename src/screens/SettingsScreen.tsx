import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, TextInput, ScrollView } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../components';
import { getTheme } from '../theme';
import type { RootStackParamList } from '../navigation';

export type SettingsScreenProps = NativeStackScreenProps<RootStackParamList, 'Settings'>;

const RARITIES = ['Common', 'Uncommon', 'Rare', 'Super Rare', 'Secret Rare', 'Leader', 'Special', 'Alternative Art', 'None'];
const STORAGE_KEY = 'collection_thresholds';

export function SettingsScreen({ navigation }: SettingsScreenProps) {
  const { user, logout } = useAuth();
  const { mode, toggleTheme } = useTheme();
  const toast = useToast();
  const [thresholdsVisible, setThresholdsVisible] = useState(false);
  const [thresholds, setThresholds] = useState<Record<string, number>>({});
  const theme = getTheme(mode);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          setThresholds(JSON.parse(raw));
        } else {
          // Default: 1 card needed to count as collected
          const defaults: Record<string, number> = {};
          RARITIES.forEach(r => defaults[r] = 1);
          setThresholds(defaults);
        }
      } catch {}
    })();
  }, []);

  const saveThresholds = async () => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(thresholds));
      toast.show('Collection thresholds saved', 'success');
      setThresholdsVisible(false);
    } catch {
      toast.show('Failed to save thresholds', 'error');
    }
  };

  const updateThreshold = (rarity: string, value: string) => {
    // Allow empty string while typing
    if (value === '') {
      setThresholds(prev => ({ ...prev, [rarity]: 0 }));
      return;
    }
    const num = parseInt(value);
    if (!isNaN(num)) {
      setThresholds(prev => ({ ...prev, [rarity]: Math.max(1, num) }));
    }
  };

  const onLogout = async () => {
    await logout();
    navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Text style={[styles.title, { color: theme.colors.text }]}>Settings</Text>
      
      <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
        <Text style={[styles.label, { color: theme.colors.mutedText }]}>Signed in as</Text>
        <Text style={[styles.value, { color: theme.colors.text }]}>{user?.email}</Text>
      </View>

      <TouchableOpacity 
        style={[styles.actionBtn, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]} 
        onPress={toggleTheme}
      >
        <View style={styles.actionRow}>
          <View style={styles.actionTextContainer}>
            <Text style={[styles.actionText, { color: theme.colors.text }]}>Dark Mode</Text>
            <Text style={[styles.actionSubtext, { color: theme.colors.mutedText }]}>
              {mode === 'dark' ? 'Enabled' : 'Disabled'}
            </Text>
          </View>
          <Ionicons 
            name={mode === 'dark' ? 'moon' : 'moon-outline'} 
            size={24} 
            color={theme.colors.primary} 
          />
        </View>
      </TouchableOpacity>

      <TouchableOpacity 
        style={[styles.actionBtn, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]} 
        onPress={() => setThresholdsVisible(true)}
      >
        <Text style={[styles.actionText, { color: theme.colors.text }]}>Count as Collected</Text>
        <Text style={[styles.actionSubtext, { color: theme.colors.mutedText }]}>Set rarity thresholds</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.logoutBtn} onPress={onLogout}>
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>

      {/* Thresholds Modal */}
      <Modal visible={thresholdsVisible} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Collection Thresholds</Text>
            <Text style={[styles.modalSubtitle, { color: theme.colors.mutedText }]}>
              Set how many of each rarity you need to count a card as "collected"
            </Text>

            <ScrollView style={styles.thresholdsList}>
              {RARITIES.map(rarity => (
                <View key={rarity} style={[styles.thresholdRow, { borderBottomColor: theme.colors.border }]}>
                  <Text style={[styles.rarityLabel, { color: theme.colors.text }]}>{rarity}</Text>
                  <TextInput
                    style={[styles.thresholdInput, { backgroundColor: theme.colors.chip, borderColor: theme.colors.border, color: theme.colors.text }]}
                    keyboardType="number-pad"
                    value={thresholds[rarity] === 0 ? '' : String(thresholds[rarity] || 1)}
                    onChangeText={(val) => updateThreshold(rarity, val)}
                    placeholder="1"
                  />
                </View>
              ))}
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setThresholdsVisible(false)}>
                <Text style={[styles.modalCancel, { color: theme.colors.mutedText }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={saveThresholds}>
                <Text style={[styles.modalConfirm, { color: theme.colors.primary }]}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 18,
  },
  card: {
    borderRadius: 12,
    padding: 18,
    borderWidth: 1,
    marginBottom: 18,
  },
  label: {
    fontSize: 12,
    marginBottom: 6,
  },
  value: {
    fontSize: 16,
    fontWeight: '600',
  },
  actionBtn: {
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 14,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  actionTextContainer: {
    flex: 1,
  },
  actionText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  actionSubtext: {
    fontSize: 12,
  },
  logoutBtn: {
    backgroundColor: '#c0392b',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 18,
  },
  logoutText: {
    color: '#fff',
    fontWeight: '700',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 18,
  },
  modalContent: {
    borderRadius: 16,
    padding: 18,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 6,
  },
  modalSubtitle: {
    fontSize: 12,
    marginBottom: 18,
  },
  thresholdsList: {
    marginBottom: 18,
  },
  thresholdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  rarityLabel: {
    fontSize: 14,
    flex: 1,
  },
  thresholdInput: {
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 6,
    width: 60,
    textAlign: 'center',
    borderWidth: 1,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 14,
    marginTop: 14,
  },
  modalCancel: {
    fontWeight: '600',
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  modalConfirm: {
    fontWeight: '700',
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
});
