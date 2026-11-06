// src/components/ConfirmModal.tsx
import React from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BigButton } from './BigButton';
import { Theme } from '@/theme';

interface ConfirmModalProps {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  icon?: keyof typeof MaterialCommunityIcons.glyphMap;
  isDestructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  visible,
  title,
  message,
  confirmLabel = 'Sí, confirmar',
  cancelLabel = 'No, volver',
  icon = 'alert-circle-outline',
  isDestructive = false,
  onConfirm,
  onCancel,
}) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <View style={styles.dialog}>
          <View style={styles.iconContainer}>
            <MaterialCommunityIcons
              name={icon}
              size={54}
              color={isDestructive ? Theme.colors.danger : Theme.colors.primary}
            />
          </View>

          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>

          <View style={styles.buttonContainer}>
            <BigButton
              label={confirmLabel}
              variant={isDestructive ? 'danger' : 'success'}
              onPress={onConfirm}
              style={styles.actionButton}
            />
            <BigButton
              label={cancelLabel}
              variant="outline"
              onPress={onCancel}
              style={styles.actionButton}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: '#00000088',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  dialog: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#FFFFFF',
    borderRadius: Theme.sizes.cardRadius,
    padding: 24,
    alignItems: 'center',
    elevation: 6,
  },
  iconContainer: {
    marginBottom: 12,
  },
  title: {
    fontSize: Theme.typography.titleLarge,
    fontWeight: 'bold',
    color: Theme.colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    fontSize: Theme.typography.bodyLarge,
    color: Theme.colors.textMuted,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 26,
  },
  buttonContainer: {
    width: '100%',
  },
  actionButton: {
    width: '100%',
    marginVertical: 6,
  },
});
