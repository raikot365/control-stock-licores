// src/app/(tabs)/mas.tsx
import React, { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { BigButton } from '@/components/BigButton';
import { Card } from '@/components/Card';
import { PriceService } from '@/services/priceService';
import { Theme } from '@/theme';
import { formatMoney } from '@/utils/format';

export default function MasScreen() {
  const router = useRouter();
  const [prices, setPrices] = useState<{ GRANDE: number; CHICA: number }>({
    GRANDE: 8000,
    CHICA: 5000,
  });

  useFocusEffect(
    useCallback(() => {
      try {
        const current = PriceService.getPrices();
        setPrices({ GRANDE: current.GRANDE, CHICA: current.CHICA });
      } catch (e) {
        console.error('Error al cargar precios:', e);
      }
    }, [])
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Card style={styles.introCard}>
        <Text style={styles.introTitle}>Configuración y Reportes</Text>
        <Text style={styles.introSubtitle}>
          Administrá los precios vigentes, promociones de combos, revisá estadísticas completas o respaldá tus datos.
        </Text>
      </Card>

      <View style={styles.menuContainer}>
        <BigButton
          label="1. Precios de Botellas"
          sublabel={`Actual: grande ${formatMoney(prices.GRANDE)} · chica ${formatMoney(prices.CHICA)}`}
          icon="currency-usd"
          variant="primary"
          onPress={() => router.push('/precios')}
          style={styles.menuBtn}
        />

        <BigButton
          label="2. Combos y Promociones"
          sublabel="Crear o editar combos (ej: Dúo de botellas)"
          icon="tag-multiple"
          variant="secondary"
          onPress={() => router.push('/combos')}
          style={styles.menuBtn}
        />

        <BigButton
          label="3. Estadísticas y Reportes"
          sublabel="Totales, ventas por sabor y exportar a Excel / CSV"
          icon="chart-bar"
          variant="primary"
          onPress={() => router.push('/estadisticas')}
          style={styles.menuBtn}
        />

        <BigButton
          label="4. Historial de Ventas"
          sublabel="Ver todas las ventas registradas y anular si hubo error"
          icon="history"
          variant="outline"
          onPress={() => router.push('/ventas')}
          style={styles.menuBtn}
        />

        <BigButton
          label="5. Copia de Seguridad"
          sublabel="Guardar respaldo o restaurar tus datos en otro celular"
          icon="cloud-upload"
          variant="outline"
          onPress={() => router.push('/respaldo')}
          style={styles.menuBtn}
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
  introCard: {
    padding: 16,
    marginBottom: 16,
  },
  introTitle: {
    fontSize: Theme.typography.titleMedium,
    fontWeight: 'bold',
    color: Theme.colors.text,
  },
  introSubtitle: {
    fontSize: Theme.typography.bodyMedium,
    color: Theme.colors.textMuted,
    marginTop: 4,
    lineHeight: 22,
  },
  menuContainer: {
    marginTop: 4,
  },
  menuBtn: {
    marginVertical: 6,
  },
});
