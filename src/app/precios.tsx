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

export default function PreciosScreen() {
  const router = useRouter();
  const [grandePrice, setGrandePrice] = useState(() => {
    try {
      return PriceService.getPrices().GRANDE.toString();
    } catch {
      return '8000';
    }
  });
  const [chicaPrice, setChicaPrice] = useState(() => {
    try {
      return PriceService.getPrices().CHICA.toString();
    } catch {
      return '5000';
    }
  });
  const [successMsg, setSuccessMsg] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSave = () => {
    const grandeNum = parseFloat(grandePrice.replace(/\./g, ''));
    const chicaNum = parseFloat(chicaPrice.replace(/\./g, ''));

    if (isNaN(grandeNum) || grandeNum <= 0) {
      setErrorMsg('Ingresá un precio válido para la botella grande');
      return;
    }
    if (isNaN(chicaNum) || chicaNum <= 0) {
      setErrorMsg('Ingresá un precio válido para la botella chica');
      return;
    }

    try {
      PriceService.updatePrices(grandeNum, chicaNum);
      setSuccessMsg(true);
      setErrorMsg('');
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
      <ScrollView contentContainerStyle={styles.content}>
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
            <View style={styles.inputContainer}>
              <Text style={styles.currencyPrefix}>$</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={grandePrice}
                onChangeText={(t) => {
                  setGrandePrice(t);
                  setSuccessMsg(false);
                }}
                placeholder="Ej: 8000"
                placeholderTextColor="#999"
              />
            </View>
          </View>

          {/* Botella Chica */}
          <View style={styles.priceField}>
            <View style={styles.fieldHeader}>
              <MaterialCommunityIcons name="glass-cocktail" size={26} color={Theme.colors.primary} />
              <Text style={styles.fieldLabel}>Botella Chica</Text>
            </View>
            <View style={styles.inputContainer}>
              <Text style={styles.currencyPrefix}>$</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={chicaPrice}
                onChangeText={(t) => {
                  setChicaPrice(t);
                  setSuccessMsg(false);
                }}
                placeholder="Ej: 5000"
                placeholderTextColor="#999"
              />
            </View>
          </View>

          {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}
          {successMsg ? (
            <View style={styles.successBox}>
              <MaterialCommunityIcons name="check-circle" size={24} color={Theme.colors.success} />
              <Text style={styles.successText}>¡Precios actualizados con éxito!</Text>
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
    marginBottom: 8,
  },
  fieldLabel: {
    fontSize: Theme.typography.bodyLarge,
    fontWeight: 'bold',
    color: Theme.colors.text,
    marginLeft: 8,
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
  },
  saveBtn: {
    marginBottom: 8,
    minHeight: 62,
  },
});
