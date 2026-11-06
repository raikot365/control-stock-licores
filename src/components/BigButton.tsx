// src/components/BigButton.tsx
import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Theme } from '@/theme';

interface BigButtonProps {
  label: string;
  sublabel?: string;
  icon?: keyof typeof MaterialCommunityIcons.glyphMap;
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'outline';
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}

export const BigButton: React.FC<BigButtonProps> = ({
  label,
  sublabel,
  icon,
  variant = 'primary',
  onPress,
  disabled = false,
  loading = false,
  style,
}) => {
  const getBackgroundColor = (pressed: boolean) => {
    if (disabled) return '#E0E0E0';
    if (variant === 'primary') return pressed ? Theme.colors.primaryDark : Theme.colors.primary;
    if (variant === 'secondary') return pressed ? '#0A3880' : Theme.colors.secondary;
    if (variant === 'success') return pressed ? '#1B5E20' : Theme.colors.success;
    if (variant === 'danger') return pressed ? '#B71C1C' : Theme.colors.danger;
    if (variant === 'warning') return pressed ? '#E65100' : Theme.colors.warning;
    if (variant === 'outline') return pressed ? '#F0F0F0' : '#FFFFFF';
    return Theme.colors.primary;
  };

  const getTextColor = () => {
    if (disabled) return '#888888';
    if (variant === 'outline') return Theme.colors.text;
    return '#FFFFFF';
  };

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: getBackgroundColor(pressed),
          borderColor: variant === 'outline' ? Theme.colors.borderBold : 'transparent',
          borderWidth: variant === 'outline' ? 2 : 0,
        },
        style,
      ]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      {loading ? (
        <ActivityIndicator size="small" color={getTextColor()} />
      ) : (
        <View style={styles.content}>
          {icon && (
            <MaterialCommunityIcons
              name={icon}
              size={28}
              color={getTextColor()}
              style={styles.icon}
            />
          )}
          <View style={styles.textContainer}>
            <Text style={[styles.label, { color: getTextColor() }]}>{label}</Text>
            {sublabel && (
              <Text
                style={[
                  styles.sublabel,
                  { color: variant === 'outline' ? Theme.colors.textMuted : '#FFFFFFEE' },
                ]}
              >
                {sublabel}
              </Text>
            )}
          </View>
        </View>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    minHeight: Theme.sizes.minButtonHeight,
    borderRadius: Theme.sizes.borderRadius,
    paddingHorizontal: 16,
    paddingVertical: 12,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    marginVertical: 6,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    marginRight: 10,
  },
  textContainer: {
    alignItems: 'center',
  },
  label: {
    fontSize: Theme.typography.button,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  sublabel: {
    fontSize: Theme.typography.caption,
    marginTop: 2,
    textAlign: 'center',
  },
});
