// src/app/ventas.tsx
import React, { useCallback, useState } from 'react';
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BigButton } from '@/components/BigButton';
import { Card } from '@/components/Card';
import { ConfirmModal } from '@/components/ConfirmModal';
import { Sale } from '@/db/types';
import { SalesService } from '@/services/salesService';
import { Theme } from '@/theme';
import { formatDateTime, formatMoney } from '@/utils/format';

export default function VentasScreen() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedSaleToCancel, setSelectedSaleToCancel] = useState<Sale | null>(null);

  const loadData = useCallback(() => {
    try {
      const history = SalesService.getSales(null, 100);
      setSales(history);
    } catch (e) {
      console.error(e);
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

  const handleConfirmCancel = () => {
    if (!selectedSaleToCancel) return;
    try {
      SalesService.cancelSale(selectedSaleToCancel.id);
      setSelectedSaleToCancel(null);
      loadData();
    } catch (e: any) {
      alert(e.message || 'Error al anular la venta');
    }
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={sales}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="cart-off" size={48} color={Theme.colors.borderBold} />
            <Text style={styles.emptyTitle}>No hay ventas registradas</Text>
          </View>
        }
        renderItem={({ item }) => {
          const isCancelled = item.status === 'ANULADA';

          return (
            <Card
              variant={isCancelled ? 'danger' : 'default'}
              style={[styles.saleCard, isCancelled && styles.cancelledCard]}
            >
              <View style={styles.saleHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.saleAmount, isCancelled && styles.cancelledText]}>
                    {formatMoney(item.total)}
                  </Text>
                  <Text style={styles.saleDate}>{formatDateTime(item.created_at)}</Text>
                </View>

                <View
                  style={[
                    styles.statusPill,
                    {
                      backgroundColor: isCancelled
                        ? Theme.colors.dangerBg
                        : Theme.colors.primaryLight,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusPillText,
                      {
                        color: isCancelled ? Theme.colors.danger : Theme.colors.primaryDark,
                      },
                    ]}
                  >
                    {isCancelled ? 'ANULADA' : item.event_name ? `Feria: ${item.event_name}` : 'Particular'}
                  </Text>
                </View>
              </View>

              {/* Líneas de venta */}
              <View style={styles.linesContainer}>
                {item.lines?.map((line, idx) => (
                  <Text key={idx} style={styles.lineText}>
                    • {line.quantity}x {line.flavor_name} ({line.size === 'GRANDE' ? 'Grande' : 'Chica'})
                    {line.combo_name ? ` [Combo: ${line.combo_name}]` : ''} - {formatMoney(line.line_total)}
                  </Text>
                ))}
              </View>

              {item.payment_method && (
                <Text style={styles.paymentInfo}>
                  Pago: <Text style={styles.bold}>{item.payment_method}</Text>
                  {item.note ? ` | Nota: ${item.note}` : ''}
                </Text>
              )}

              {/* Botón anular si está activa */}
              {!isCancelled && (
                <BigButton
                  label="Anular esta venta"
                  sublabel="Devuelve las botellas al stock"
                  icon="undo"
                  variant="outline"
                  onPress={() => setSelectedSaleToCancel(item)}
                  style={styles.cancelBtn}
                />
              )}
            </Card>
          );
        }}
      />

      {/* Modal Confirmación Anulación */}
      <ConfirmModal
        visible={!!selectedSaleToCancel}
        title="¿Anular esta venta?"
        message={`Se devolverán las botellas al stock y la venta de ${selectedSaleToCancel ? formatMoney(selectedSaleToCancel.total) : ''} se marcará como anulada.`}
        confirmLabel="Sí, anular venta"
        cancelLabel="No, conservar"
        isDestructive={true}
        onConfirm={handleConfirmCancel}
        onCancel={() => setSelectedSaleToCancel(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  saleCard: {
    marginVertical: 6,
    padding: 16,
  },
  cancelledCard: {
    opacity: 0.75,
  },
  saleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  saleAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Theme.colors.primaryDark,
  },
  cancelledText: {
    textDecorationLine: 'line-through',
    color: Theme.colors.danger,
  },
  saleDate: {
    fontSize: 13,
    color: Theme.colors.textMuted,
    marginTop: 2,
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusPillText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  linesContainer: {
    marginVertical: 6,
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: '#00000010',
  },
  lineText: {
    fontSize: Theme.typography.bodyMedium,
    color: Theme.colors.text,
    marginVertical: 2,
  },
  paymentInfo: {
    fontSize: 13,
    color: Theme.colors.textMuted,
    marginTop: 4,
  },
  bold: {
    fontWeight: 'bold',
    color: Theme.colors.text,
  },
  cancelBtn: {
    marginTop: 10,
    minHeight: 48,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: Theme.typography.bodyLarge,
    color: Theme.colors.textMuted,
    marginTop: 10,
  },
});
