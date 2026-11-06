// src/components/QuantityStepper.tsx
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Theme } from '@/theme';

interface QuantityStepperProps {
  label?: string;
  sublabel?: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (newValue: number) => void;
}

export const QuantityStepper: React.FC<QuantityStepperProps> = ({
  label,
  sublabel,
  value,
  min = 0,
  max = 9999,
  step = 1,
  onChange,
}) => {
  const canDecrease = value > min;
  const canIncrease = value < max;

  const handleDecrease = () => {
    if (canDecrease) {
      onChange(Math.max(min, value - step));
    }
  };

  const handleIncrease = () => {
    if (canIncrease) {
      onChange(Math.min(max, value + step));
    }
  };

  return (
    <View style={styles.container}>
      {(label || sublabel) && (
        <View style={styles.header}>
          {label && <Text style={styles.label}>{label}</Text>}
          {sublabel && <Text style={styles.sublabel}>{sublabel}</Text>}
        </View>
      )}

      <View style={styles.controlsRow}>
        {/* Botón Menos */}
        <Pressable
          onPress={handleDecrease}
          disabled={!canDecrease}
          style={({ pressed }) => [
            styles.stepperButton,
            {
              backgroundColor: canDecrease
                ? pressed
                  ? '#D32F2F'
                  : Theme.colors.danger
                : '#E0E0E0',
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Disminuir cantidad"
        >
          <MaterialCommunityIcons
            name="minus"
            size={36}
            color={canDecrease ? '#FFFFFF' : '#9E9E9E'}
          />
        </Pressable>

        {/* Número Central Grande */}
        <View style={styles.numberBox}>
          <Text style={styles.numberText}>{value}</Text>
        </View>

        {/* Botón Más */}
        <Pressable
          onPress={handleIncrease}
          disabled={!canIncrease}
          style={({ pressed }) => [
            styles.stepperButton,
            {
              backgroundColor: canIncrease
                ? pressed
                  ? '#1B5E20'
                  : Theme.colors.success
                : '#E0E0E0',
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Aumentar cantidad"
        >
          <MaterialCommunityIcons
            name="plus"
            size={36}
            color={canIncrease ? '#FFFFFF' : '#9E9E9E'}
          />
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: Theme.sizes.borderRadius,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  header: {
    marginBottom: 8,
    alignItems: 'center',
  },
  label: {
    fontSize: Theme.typography.bodyLarge,
    fontWeight: 'bold',
    color: Theme.colors.text,
    textAlign: 'center',
  },
  sublabel: {
    fontSize: Theme.typography.caption,
    color: Theme.colors.textMuted,
    marginTop: 2,
    textAlign: 'center',
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperButton: {
    width: Theme.sizes.stepperButtonSize,
    height: Theme.sizes.stepperButtonSize,
    borderRadius: Theme.sizes.borderRadius,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
  },
  numberBox: {
    minWidth: 80,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  numberText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: Theme.colors.text,
  },
});
