// src/app/precios.tsx
import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BigButton } from '@/components/BigButton';
import { Card } from '@/components/Card';
import { PriceService } from '@/services/priceService';
import { Theme } from '@/theme';
import { formatMoney } from '@/utils/format';

/** Deja sólo dígitos (los precios son enteros) */
function onlyDigits(text: string): string {
  return text.replace(/\D/g, '');
}

/** Agrupa miles con punto: "10000" -> "10.000" */
function groupThousands(digits: string): string {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

export default function PreciosScreen() {
  const router = useRouter();

  // Precios vigentes al abrir la pantalla (sólo como referencia)
  const [currentPrices] = useState(() => {
    try {
      return PriceService.getPrices();
    } catch {
      return { GRANDE: 8000, CHICA: 5000 };
    }
  });

  const [grandeDigits, setGrandeDigits] = useState(() => String(currentPrices.GRANDE));
  const [chicaDigits, setChicaDigits] = useState(() => String(currentPrices.CHICA));
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleChange = (setter: (value: string) => void) => (text: string) => {
    setter(onlyDigits(text).slice(0, 9));
    setSuccessMsg('');
    setErrorMsg('');
  };

  const handleSave = () => {
    const grandeNum = Number(grandeDigits);
    const chicaNum = Number(chicaDigits);

    if (!grandeDigits || isNaN(grandeNum) || grandeNum <= 0) {
      setErrorMsg('Ingresá un precio válido para la botella grande');
      return;
    }
    if (!chicaDigits || isNaN(chicaNum) || chicaNum <= 0) {
      setErrorMsg('Ingresá un precio válido para la botella chica');
      return;
    }

    if (grandeNum === currentPrices.GRANDE && chicaNum === currentPrices.CHICA) {
      setErrorMsg('');
      setSuccessMsg('Los precios ya están actualizados.');
      return;
    }

    try {
      PriceService.updatePrices(grandeNum, chicaNum);
      setErrorMsg('');
      setSuccessMsg('¡Precios actualizados con éxito!');
      setTimeout(() => {
        router.back();
      }, 1200);
    } catch (e: any) {
      setErrorMsg(e.message || 'Error al guardar precios');
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <Card style={styles.card}>
          <Text style={styles.title}>Precios Unitarios Vigentes</Text>
          <Text style={styles.subtitle}>
            Al cambiar los precios, se aplicarán únicamente a las nuevas ventas. El historial anterior no se modifica.
          </Text>

          {/* Botella Grande */}
          <View style={styles.priceField}>
            <View style={styles.fieldHeader}>
              <MaterialCommunityIcons name="bottle-wine" size={28} color={Theme.colors.primary} />
              <Text style={styles.fieldLabel}>Botella Grande</Text>
            </View>
            <Text style={styles.currentPrice}>
              Precio actual: {formatMoney(currentPrices.GRANDE)}
            </Text>
            <View style={styles.inputContainer}>
              <Text style={styles.currencyPrefix}>$</Text>
              <TextInput
                style={styles.input}
                keyboardType="number-pad"
                value={groupThousands(grandeDigits)}
                onChangeText={handleChange(setGrandeDigits)}
                placeholder="Ej: 8.000"
                placeholderTextColor="#999"
                selectTextOnFocus
                accessibilityLabel="Precio de botella grande"
              />
            </View>
          </View>

          {/* Botella Chica */}
          <View style={styles.priceField}>
            <View style={styles.fieldHeader}>
              <MaterialCommunityIcons name="glass-cocktail" size={26} color={Theme.colors.primary} />
              <Text style={styles.fieldLabel}>Botella Chica</Text>
            </View>
            <Text style={styles.currentPrice}>
              Precio actual: {formatMoney(currentPrices.CHICA)}
            </Text>
            <View style={styles.inputContainer}>
              <Text style={styles.currencyPrefix}>$</Text>
              <TextInput
                style={styles.input}
                keyboardType="number-pad"
                value={groupThousands(chicaDigits)}
                onChangeText={handleChange(setChicaDigits)}
                placeholder="Ej: 5.000"
                placeholderTextColor="#999"
                selectTextOnFocus
                accessibilityLabel="Precio de botella chica"
              />
            </View>
          </View>

          {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}
          {successMsg ? (
            <View style={styles.successBox}>
              <MaterialCommunityIcons
                name="check-circle"
                size={24}
                color={Theme.colors.success}
              />
              <Text style={styles.successText}>{successMsg}</Text>
            </View>
          ) : null}

          <BigButton
            label="Guardar Nuevos Precios"
            icon="content-save"
            variant="success"
            onPress={handleSave}
            style={styles.saveBtn}
          />

          <BigButton
            label="Volver"
            variant="outline"
            onPress={() => router.back()}
          />
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    padding: 20,
  },
  title: {
    fontSize: Theme.typography.titleMedium,
    fontWeight: 'bold',
    color: Theme.colors.text,
  },
  subtitle: {
    fontSize: Theme.typography.bodyMedium,
    color: Theme.colors.textMuted,
    marginTop: 4,
    marginBottom: 20,
    lineHeight: 22,
  },
  priceField: {
    marginBottom: 20,
  },
  fieldHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  fieldLabel: {
    fontSize: Theme.typography.bodyLarge,
    fontWeight: 'bold',
    color: Theme.colors.text,
    marginLeft: 8,
  },
  currentPrice: {
    fontSize: Theme.typography.caption,
    color: Theme.colors.textMuted,
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Theme.colors.primary,
    borderRadius: Theme.sizes.borderRadius,
    backgroundColor: '#FAFAFA',
    paddingHorizontal: 16,
  },
  currencyPrefix: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Theme.colors.primary,
    marginRight: 6,
  },
  input: {
    flex: 1,
    fontSize: 28,
    fontWeight: 'bold',
    color: Theme.colors.text,
    paddingVertical: 12,
  },
  errorText: {
    color: Theme.colors.danger,
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  successBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Theme.colors.successBg,
    padding: 12,
    borderRadius: Theme.sizes.borderRadius,
    marginBottom: 16,
  },
  successText: {
    color: Theme.colors.success,
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 8,
    flexShrink: 1,
  },
  saveBtn: {
    marginBottom: 8,
    minHeight: 62,
  },
});
