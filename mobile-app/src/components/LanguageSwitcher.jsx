import React from 'react';
import { View, Text, TouchableOpacity, Modal, FlatList, StyleSheet } from 'react-native';
import { useTranslation } from '../hooks/useTranslation';
import { colors, borderRadius, fontSize } from '../theme';

const LANGS = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'Hindi' },
  { code: 'mr', label: 'Marathi' },
  { code: 'gu', label: 'Gujarati' },
  { code: 'ta', label: 'Tamil' },
  { code: 'te', label: 'Telugu' },
  { code: 'bn', label: 'Bengali' },
  { code: 'kn', label: 'Kannada' },
  { code: 'ml', label: 'Malayalam' },
  { code: 'pa', label: 'Punjabi' },
];

export default function LanguageSwitcher() {
  const { t, i18n } = useTranslation();
  const [visible, setVisible] = React.useState(false);
  const current = i18n.language || 'en';

  return (
    <>
      <TouchableOpacity style={styles.trigger} onPress={() => setVisible(true)}>
        <Text style={styles.triggerText}>{current.toUpperCase()}</Text>
      </TouchableOpacity>
      <Modal visible={visible} transparent animationType="fade">
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setVisible(false)}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>{t('language.selectLanguage')}</Text>
            <FlatList
              data={LANGS}
              keyExtractor={(item) => item.code}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.option, item.code === current && styles.optionActive]}
                  onPress={() => {
                    i18n.changeLanguage(item.code);
                    setVisible(false);
                  }}
                >
                  <Text style={styles.optionText}>{item.label}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: { paddingHorizontal: 10, paddingVertical: 6, backgroundColor: colors.surfaceCard, borderRadius: borderRadius.lg },
  triggerText: { color: colors.text, fontWeight: '600', fontSize: fontSize.xs },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 24 },
  modal: { backgroundColor: colors.surface, borderRadius: borderRadius.xl, padding: 16, maxHeight: 400 },
  modalTitle: { color: colors.text, fontWeight: '700', fontSize: fontSize.base, marginBottom: 12 },
  option: { paddingVertical: 12, paddingHorizontal: 8, borderRadius: borderRadius.lg },
  optionActive: { backgroundColor: 'rgba(243,182,27,0.2)' },
  optionText: { color: colors.text, fontSize: 15 },
});
