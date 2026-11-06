// src/components/Card.tsx
import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { Theme } from '@/theme';

interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  variant?: 'default' | 'highlight' | 'warning' | 'danger';
}

export const Card: React.FC<CardProps> = ({
  children,
  style,
  variant = 'default',
}) => {
  const getBorderColor = () => {
    if (variant === 'highlight') return Theme.colors.primary;
    if (variant === 'warning') return Theme.colors.warning;
    if (variant === 'danger') return Theme.colors.danger;
    return Theme.colors.border;
  };

  const getBackgroundColor = () => {
    if (variant === 'highlight') return Theme.colors.primaryLight;
    if (variant === 'warning') return Theme.colors.warningBg;
    if (variant === 'danger') return Theme.colors.dangerBg;
    return Theme.colors.surface;
  };

  return (
    <View
      style={[
        styles.card,
        {
          borderColor: getBorderColor(),
          backgroundColor: getBackgroundColor(),
        },
        style,
      ]}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: Theme.sizes.cardRadius,
    padding: 16,
    marginVertical: 8,
    borderWidth: 1.5,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
});
