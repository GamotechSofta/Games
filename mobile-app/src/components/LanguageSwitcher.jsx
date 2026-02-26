import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, FlatList, StyleSheet } from 'react-native';
import { useTranslation } from '../hooks/useTranslation';
import { colors, borderRadius, fontSize } from '../theme';

// Match frontend LanguageSwitcher: same list and changeLanguage behaviour (await so UI updates)
const languages = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिंदी' },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी' },
  { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা' },
  { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ' },
  { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം' },
  { code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ' },
];

export default function LanguageSwitcher({ onClose, open: openFromParent }) {
  const { t, i18n } = useTranslation();
  const [visible, setVisible] = useState(false);
  const currentLanguage = languages.find((lang) => lang.code === i18n.language) || languages[0];
  const isModalOpen = visible || !!openFromParent;

  const closeModal = () => {
    setVisible(false);
    onClose?.();
  };

  const changeLanguage = async (langCode) => {
    await i18n.changeLanguage(langCode);
    closeModal();
  };

  return (
    <>
      <TouchableOpacity style={styles.trigger} onPress={() => setVisible(true)}>
        <Text style={styles.triggerText}>{currentLanguage.nativeName}</Text>
      </TouchableOpacity>
      <Modal visible={isModalOpen} transparent animationType="fade">
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={closeModal}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>{t('language.selectLanguage')}</Text>
            <FlatList
              data={languages}
              keyExtractor={(item) => item.code}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.option, i18n.language === item.code && styles.optionActive]}
                  onPress={() => changeLanguage(item.code)}
                >
                  <Text style={styles.optionText}>{item.nativeName}</Text>
                  <Text style={styles.optionSubtext}>{item.name}</Text>
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
  option: { paddingVertical: 12, paddingHorizontal: 12, borderRadius: borderRadius.lg },
  optionActive: { backgroundColor: 'rgba(212,175,55,0.2)' },
  optionText: { color: colors.text, fontSize: 15, fontWeight: '600' },
  optionSubtext: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
});
