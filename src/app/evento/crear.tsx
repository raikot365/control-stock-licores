// src/app/evento/crear.tsx
import React, { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { BigButton } from '@/components/BigButton';
import { Card } from '@/components/Card';
import { QuantityStepper } from '@/components/QuantityStepper';
import { BottleSize, FlavorWithStock } from '@/db/types';
import { EventService } from '@/services/eventService';
import { StockService } from '@/services/stockService';
import { Theme } from '@/theme';

export default function CrearEventoScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [flavors] = useState<FlavorWithStock[]>(() => {
    try {
      return StockService.getFlavorsWithStock(false);
    } catch {
      return [];
    }
  });

  // Cantidades a llevar: clave `${flavorId}_${size}`
  const [stockTaken, setStockTaken] = useState<Record<string, number>>({});
  const [errorMsg, setErrorMsg] = useState('');

  const handleQtyChange = (flavorId: number, size: BottleSize, qty: number) => {
    const key = `${flavorId}_${size}`;
    setStockTaken((prev) => ({
      ...prev,
      [key]: qty,
    }));
  };

  const getQty = (flavorId: number, size: BottleSize) => {
    return stockTaken[`${flavorId}_${size}`] || 0;
  };

  const totalBottlesTaken = Object.values(stockTaken).reduce((a, b) => a + b, 0);

  const handleCreate = () => {
    if (!name.trim()) {
      setErrorMsg('Por favor ingresá el nombre del evento');
      return;
    }

    const items: { flavorId: number; size: BottleSize; quantityTaken: number }[] = [];
    for (const [key, qty] of Object.entries(stockTaken)) {
      if (qty > 0) {
        const [flavorIdStr, sizeStr] = key.split('_');
        items.push({
          flavorId: Number(flavorIdStr),
          size: sizeStr as BottleSize,
          quantityTaken: qty,
        });
      }
    }

    try {
      const newId = EventService.createEvent(name.trim(), date, items);
      router.replace(`/evento/${newId}` as any);
    } catch (e: any) {
      setErrorMsg(e.message || 'Error al crear evento');
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Card style={styles.infoCard}>
        <Text style={styles.infoTitle}>1. Datos del Evento</Text>

        <Text style={styles.inputLabel}>Nombre de la feria o evento:</Text>
        <TextInput
          style={styles.textInput}
          placeholder="Ej: Feria de la Plaza, Fiesta de la Cerveza..."
          placeholderTextColor="#999"
          value={name}
          onChangeText={(t) => {
            setName(t);
            if (errorMsg) setErrorMsg('');
          }}
        />

        <Text style={styles.inputLabel}>Fecha (AAAA-MM-DD):</Text>
        <TextInput
          style={styles.textInput}
          placeholder="2026-11-06"
          placeholderTextColor="#999"
          value={date}
          onChangeText={setDate}
        />

        {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}
      </Card>

      <Card style={styles.infoCard}>
        <Text style={styles.infoTitle}>2. Stock que vas a llevar</Text>
        <Text style={styles.infoSubtitle}>
          El stock no se descuenta ahora; solo sirve para saber qué botellas tenés disponibles en el evento.
        </Text>

        {flavors.map((flavor) => (
          <View key={flavor.id} style={styles.flavorSection}>
            <Text style={styles.flavorTitle}>{flavor.name}</Text>
            <Text style={styles.flavorAvailableStock}>
              (Disponible en stock: {flavor.grandeQty} grandes, {flavor.chicaQty} chicas)
            </Text>

            <QuantityStepper
              label="Botellas Grandes a llevar:"
              value={getQty(flavor.id, 'GRANDE')}
              min={0}
              onChange={(val) => handleQtyChange(flavor.id, 'GRANDE', val)}
            />

            <QuantityStepper
              label="Botellas Chicas a llevar:"
              value={getQty(flavor.id, 'CHICA')}
              min={0}
              onChange={(val) => handleQtyChange(flavor.id, 'CHICA', val)}
            />
          </View>
        ))}
      </Card>

      {/* Resumen y Botón de Creación */}
      <View style={styles.summaryBox}>
        <Text style={styles.summaryTotalText}>
          Total a llevar: <Text style={styles.bold}>{totalBottlesTaken} botellas</Text>
        </Text>

        <BigButton
          label="Crear Evento y Empezar"
          icon="check-circle"
          variant="success"
          onPress={handleCreate}
          style={styles.createBtn}
        />
        <BigButton
          label="Cancelar"
          variant="outline"
          onPress={() => router.back()}
        />
      </View>
    </ScrollView>
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
  infoCard: {
    marginBottom: 16,
    padding: 16,
  },
  infoTitle: {
    fontSize: Theme.typography.titleMedium,
    fontWeight: 'bold',
    color: Theme.colors.text,
    marginBottom: 4,
  },
  infoSubtitle: {
    fontSize: Theme.typography.bodyMedium,
    color: Theme.colors.textMuted,
    marginBottom: 16,
    lineHeight: 22,
  },
  inputLabel: {
    fontSize: Theme.typography.bodyLarge,
    fontWeight: 'bold',
    color: Theme.colors.text,
    marginTop: 10,
    marginBottom: 6,
  },
  textInput: {
    borderWidth: 1.5,
    borderColor: Theme.colors.borderBold,
    borderRadius: Theme.sizes.borderRadius,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: Theme.typography.bodyLarge,
    color: Theme.colors.text,
    backgroundColor: '#FFFFFF',
    marginBottom: 8,
  },
  errorText: {
    color: Theme.colors.danger,
    fontSize: 15,
    fontWeight: 'bold',
    marginTop: 6,
  },
  flavorSection: {
    borderTopWidth: 1,
    borderTopColor: '#00000015',
    paddingTop: 12,
    marginTop: 8,
  },
  flavorTitle: {
    fontSize: Theme.typography.titleMedium,
    fontWeight: 'bold',
    color: Theme.colors.primaryDark,
  },
  flavorAvailableStock: {
    fontSize: Theme.typography.caption,
    color: Theme.colors.textMuted,
    marginBottom: 8,
  },
  summaryBox: {
    marginTop: 10,
    alignItems: 'center',
  },
  summaryTotalText: {
    fontSize: Theme.typography.titleMedium,
    color: Theme.colors.text,
    marginBottom: 12,
  },
  bold: {
    fontWeight: 'bold',
    color: Theme.colors.primary,
  },
  createBtn: {
    width: '100%',
    minHeight: 62,
    marginBottom: 8,
  },
});
