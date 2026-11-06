// src/app/(tabs)/index.tsx
import React, { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BigButton } from '@/components/BigButton';
import { Card } from '@/components/Card';
import { ConfirmModal } from '@/components/ConfirmModal';
import { Sale, StockSummary } from '@/db/types';
import { SalesService } from '@/services/salesService';
import { StockService } from '@/services/stockService';
import { Theme } from '@/theme';
import { formatMoney } from '@/utils/format';

export default function HomeScreen() {
  const router = useRouter();
  const [summary, setSummary] = useState<StockSummary>({
    totalBottles: 0,
    totalGrande: 0,
    totalChica: 0,
    lowStockCount: 0,
    outOfStockCount: 0,
  });
  const [lastSale, setLastSale] = useState<Sale | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [cancelModalVisible, setCancelModalVisible] = useState(false);

  const loadData = useCallback(() => {
    try {
      const stockSum = StockService.getStockSummary();
      setSummary(stockSum);
      const recent = SalesService.getLastActiveSale();
      setLastSale(recent);
    } catch (e) {
      console.error('Error al cargar datos del inicio:', e);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadData();
    setIsRefreshing(false);
  };

  const handleConfirmCancelLastSale = () => {
    if (!lastSale) return;
    try {
      SalesService.cancelSale(lastSale.id);
      setCancelModalVisible(false);
      loadData();
    } catch (e: any) {
      alert(e.message || 'Error al anular la venta');
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />}
    >
      {/* Tarjeta de Resumen de Stock Superior */}
      <Card variant="highlight" style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Total de Botellas en Stock</Text>
        <Text style={styles.totalBottlesNumber}>{summary.totalBottles}</Text>

        <View style={styles.sizeBreakdownRow}>
          <View style={styles.sizeBox}>
            <MaterialCommunityIcons name="bottle-wine" size={28} color={Theme.colors.primary} />
            <Text style={styles.sizeLabel}>Grandes</Text>
            <Text style={styles.sizeCount}>{summary.totalGrande}</Text>
          </View>

          <View style={styles.dividerVertical} />

          <View style={styles.sizeBox}>
            <MaterialCommunityIcons name="glass-cocktail" size={26} color={Theme.colors.primary} />
            <Text style={styles.sizeLabel}>Chicas</Text>
            <Text style={styles.sizeCount}>{summary.totalChica}</Text>
          </View>
        </View>

        {summary.lowStockCount > 0 && (
          <View style={styles.alertNotice}>
            <MaterialCommunityIcons name="alert-outline" size={22} color={Theme.colors.warning} />
            <Text style={styles.alertText}>
              Hay {summary.lowStockCount} sabores con stock bajo (2 o menos).
            </Text>
          </View>
        )}
      </Card>

      {/* 4 Botones de Acción Principales */}
      <View style={styles.actionsContainer}>
        <BigButton
          label="1. Ver y Cargar Stock"
          sublabel="Revisar sabores y sumar botellas"
          icon="bottle-wine-outline"
          variant="primary"
          onPress={() => router.push('/(tabs)/stock')}
          style={styles.actionBtn}
        />

        <BigButton
          label="2. Registrar Venta"
          sublabel="Venta particular o en evento"
          icon="cash-register"
          variant="success"
          onPress={() => router.push('/(tabs)/vender')}
          style={styles.actionBtn}
        />

        <BigButton
          label="3. Eventos y Ferias"
          sublabel="Llevar stock y vender en ferias"
          icon="calendar-star"
          variant="secondary"
          onPress={() => router.push('/(tabs)/eventos')}
          style={styles.actionBtn}
        />

        <BigButton
          label="4. Más Opciones"
          sublabel="Precios, combos, estadísticas y respaldo"
          icon="dots-horizontal-circle-outline"
          variant="outline"
          onPress={() => router.push('/(tabs)/mas')}
          style={styles.actionBtn}
        />
      </View>

      {/* Opción de Deshacer Última Venta */}
      {lastSale && (
        <Card variant="default" style={styles.lastSaleCard}>
          <View style={styles.lastSaleHeader}>
            <MaterialCommunityIcons name="history" size={24} color={Theme.colors.textMuted} />
            <Text style={styles.lastSaleTitle}>Última venta registrada</Text>
          </View>
          <Text style={styles.lastSaleDetails}>
            Total: <Text style={styles.boldText}>{formatMoney(lastSale.total)}</Text>
            {lastSale.lines && ` (${lastSale.lines.reduce((a, b) => a + b.quantity, 0)} botellas)`}
          </Text>

          <BigButton
            label="Anular / Deshacer esta venta"
            sublabel="Devuelve las botellas al stock si hubo un error"
            icon="undo"
            variant="danger"
            onPress={() => setCancelModalVisible(true)}
            style={styles.undoBtn}
          />
        </Card>
      )}

      {/* Modal de Confirmación para Anular */}
      <ConfirmModal
        visible={cancelModalVisible}
        title="¿Anular la última venta?"
        message={`Se devolverán las botellas al stock y la venta de ${lastSale ? formatMoney(lastSale.total) : ''} dejará de contar en las estadísticas.`}
        confirmLabel="Sí, anular venta"
        cancelLabel="No, conservar venta"
        isDestructive={true}
        onConfirm={handleConfirmCancelLastSale}
        onCancel={() => setCancelModalVisible(false)}
      />
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
    paddingBottom: 32,
  },
  summaryCard: {
    alignItems: 'center',
    paddingVertical: 20,
    marginBottom: 16,
  },
  summaryTitle: {
    fontSize: Theme.typography.bodyLarge,
    color: Theme.colors.textMuted,
    fontWeight: '600',
  },
  totalBottlesNumber: {
    fontSize: 52,
    fontWeight: '900',
    color: Theme.colors.primaryDark,
    marginVertical: 4,
  },
  sizeBreakdownRow: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#00000015',
  },
  sizeBox: {
    alignItems: 'center',
    flex: 1,
  },
  dividerVertical: {
    width: 1,
    height: 48,
    backgroundColor: '#00000020',
  },
  sizeLabel: {
    fontSize: Theme.typography.bodyMedium,
    color: Theme.colors.textMuted,
    marginTop: 2,
  },
  sizeCount: {
    fontSize: 26,
    fontWeight: 'bold',
    color: Theme.colors.text,
  },
  alertNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.warningBg,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 14,
  },
  alertText: {
    fontSize: Theme.typography.caption,
    color: Theme.colors.warning,
    fontWeight: 'bold',
    marginLeft: 6,
    flex: 1,
  },
  actionsContainer: {
    marginVertical: 8,
  },
  actionBtn: {
    marginVertical: 6,
  },
  lastSaleCard: {
    marginTop: 12,
    backgroundColor: '#FFFFFF',
    borderStyle: 'dashed',
  },
  lastSaleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  lastSaleTitle: {
    fontSize: Theme.typography.bodyLarge,
    fontWeight: 'bold',
    color: Theme.colors.textMuted,
    marginLeft: 8,
  },
  lastSaleDetails: {
    fontSize: Theme.typography.bodyLarge,
    color: Theme.colors.text,
    marginBottom: 10,
  },
  boldText: {
    fontWeight: 'bold',
    color: Theme.colors.primary,
  },
  undoBtn: {
    minHeight: 52,
  },
});
