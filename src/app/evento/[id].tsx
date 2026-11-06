// src/app/evento/[id].tsx
import React, { useCallback, useState } from 'react';
import {
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { BigButton } from '@/components/BigButton';
import { Card } from '@/components/Card';
import { ConfirmModal } from '@/components/ConfirmModal';
import { QuantityStepper } from '@/components/QuantityStepper';
import { EventStockItem, Sale } from '@/db/types';
import { EventBalanceSummary, EventService } from '@/services/eventService';
import { ExportService } from '@/services/exportService';
import { SalesService } from '@/services/salesService';
import { Theme } from '@/theme';
import { formatDateOnly, formatDateTime, formatMoney } from '@/utils/format';

export default function EventDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const eventId = Number(id);

  const [balance, setBalance] = useState<EventBalanceSummary | null>(null);
  const [sales, setSales] = useState<Sale[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Modales
  const [finishModalVisible, setFinishModalVisible] = useState(false);
  const [addStockModalVisible, setAddStockModalVisible] = useState(false);
  const [selectedStockItem, setSelectedStockItem] = useState<EventStockItem | null>(null);
  const [extraQuantity, setExtraQuantity] = useState(1);
  const [exportLoading, setExportLoading] = useState(false);

  const loadData = useCallback(() => {
    if (!eventId) return;
    try {
      const b = EventService.getEventBalance(eventId);
      setBalance(b);
      const evSales = SalesService.getSales(eventId);
      setSales(evSales);
    } catch (e) {
      console.error('Error cargando detalle del evento:', e);
    }
  }, [eventId]);

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

  const handleFinishEvent = () => {
    try {
      EventService.updateEventStatus(eventId, 'FINALIZADO');
      setFinishModalVisible(false);
      loadData();
    } catch (e: any) {
      alert(e.message || 'Error al finalizar evento');
    }
  };

  const handleAddExtraStock = () => {
    if (!selectedStockItem) return;
    try {
      EventService.addStockToEvent(
        eventId,
        selectedStockItem.flavor_id,
        selectedStockItem.size,
        extraQuantity
      );
      setAddStockModalVisible(false);
      loadData();
    } catch (e: any) {
      alert(e.message || 'Error al agregar stock');
    }
  };

  const handleExportXLSX = async () => {
    try {
      setExportLoading(true);
      const uri = await ExportService.exportEventXLSX(eventId);
      await ExportService.shareFile(uri, 'Compartir reporte de evento (Excel)');
    } catch (e: any) {
      alert(e.message || 'Error al exportar');
    } finally {
      setExportLoading(false);
    }
  };

  const handleExportCSV = async () => {
    try {
      setExportLoading(true);
      const uri = await ExportService.exportEventCSV(eventId);
      await ExportService.shareFile(uri, 'Compartir reporte de evento (CSV)');
    } catch (e: any) {
      alert(e.message || 'Error al exportar');
    } finally {
      setExportLoading(false);
    }
  };

  if (!balance) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.loadingText}>Cargando evento...</Text>
      </View>
    );
  }

  const isFinalized = balance.event.status === 'FINALIZADO';

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />}
    >
      {/* Cabecera del Evento */}
      <Card variant="highlight" style={styles.headerCard}>
        <View style={styles.headerTop}>
          <Text style={styles.eventTitle}>{balance.event.name}</Text>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: isFinalized ? '#757575' : Theme.colors.success },
            ]}
          >
            <Text style={styles.statusBadgeText}>{balance.event.status}</Text>
          </View>
        </View>

        <Text style={styles.eventDateText}>Fecha: {formatDateOnly(balance.event.date)}</Text>

        {/* Resumen en vivo */}
        <View style={styles.liveMetrics}>
          <View style={styles.liveMetricBox}>
            <Text style={styles.liveMetricLabel}>Recaudado</Text>
            <Text style={[styles.liveMetricVal, { color: Theme.colors.primaryDark }]}>
              {formatMoney(balance.totalRevenue)}
            </Text>
          </View>
          <View style={styles.liveMetricDivider} />
          <View style={styles.liveMetricBox}>
            <Text style={styles.liveMetricLabel}>Vendidas</Text>
            <Text style={[styles.liveMetricVal, { color: Theme.colors.success }]}>
              {balance.totalSold}
            </Text>
          </View>
          <View style={styles.liveMetricDivider} />
          <View style={styles.liveMetricBox}>
            <Text style={styles.liveMetricLabel}>Restantes</Text>
            <Text style={styles.liveMetricVal}>{balance.totalRemaining}</Text>
          </View>
        </View>
      </Card>

      {/* Botón de Vender en este Evento */}
      {!isFinalized && (
        <BigButton
          label="VENDER EN ESTE EVENTO"
          sublabel="Descuenta automáticamente del stock del evento"
          icon="cash-register"
          variant="success"
          onPress={() => router.push('/(tabs)/vender')}
          style={styles.actionBtn}
        />
      )}

      {/* Control de Stock Llevado al Evento */}
      <Card style={styles.cardSection}>
        <Text style={styles.cardSectionTitle}>Stock en el Evento</Text>
        <Text style={styles.cardSectionSubtitle}>
          Total llevado: {balance.totalTaken} botellas
        </Text>

        {balance.items.map((item) => (
          <View key={item.id} style={styles.stockItemRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.stockItemFlavor}>
                {item.flavor_name} ({item.size === 'GRANDE' ? 'Grande' : 'Chica'})
              </Text>
              <Text style={styles.stockItemDetail}>
                Llevadas: {item.quantity_taken} | Vendidas:{' '}
                <Text style={{ color: Theme.colors.success, fontWeight: 'bold' }}>
                  {item.quantity_sold}
                </Text>
              </Text>
            </View>

            <View style={styles.stockItemRight}>
              <View style={styles.remainingPill}>
                <Text style={styles.remainingPillText}>Quedan {item.quantity_remaining}</Text>
              </View>

              {!isFinalized && (
                <BigButton
                  label="+"
                  variant="outline"
                  onPress={() => {
                    setSelectedStockItem(item);
                    setExtraQuantity(1);
                    setAddStockModalVisible(true);
                  }}
                  style={styles.addMoreMiniBtn}
                />
              )}
            </View>
          </View>
        ))}
      </Card>

      {/* Exportar y Compartir */}
      <Card style={styles.cardSection}>
        <Text style={styles.cardSectionTitle}>Exportar y Compartir</Text>
        <Text style={styles.cardSectionSubtitle}>
          Generá el reporte para enviar por WhatsApp o guardar en Excel
        </Text>

        <BigButton
          label="Compartir en Excel (.xlsx)"
          icon="file-excel"
          variant="primary"
          loading={exportLoading}
          onPress={handleExportXLSX}
          style={styles.exportBtn}
        />

        <BigButton
          label="Compartir en CSV"
          icon="file-delimited"
          variant="outline"
          loading={exportLoading}
          onPress={handleExportCSV}
          style={styles.exportBtn}
        />
      </Card>

      {/* Historial de Ventas del Evento */}
      <Card style={styles.cardSection}>
        <Text style={styles.cardSectionTitle}>Ventas en este Evento ({sales.length})</Text>
        {sales.length === 0 ? (
          <Text style={styles.emptySalesText}>Todavía no se registraron ventas en este evento.</Text>
        ) : (
          sales.map((sale) => (
            <View key={sale.id} style={styles.saleItemRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.saleItemTotal}>{formatMoney(sale.total)}</Text>
                <Text style={styles.saleItemDate}>{formatDateTime(sale.created_at)}</Text>
                {sale.lines && (
                  <Text style={styles.saleItemLines}>
                    {sale.lines
                      .map((l) => `${l.quantity}x ${l.flavor_name} (${l.size === 'GRANDE' ? 'Gde' : 'Ch'})`)
                      .join(', ')}
                  </Text>
                )}
              </View>
            </View>
          ))
        )}
      </Card>

      {/* Finalizar Evento */}
      {!isFinalized && (
        <BigButton
          label="Finalizar Evento"
          sublabel="Cierra el evento y congela el balance"
          icon="flag-checkered"
          variant="danger"
          onPress={() => setFinishModalVisible(true)}
          style={styles.finishBtn}
        />
      )}

      {/* Modal Confirmar Finalización */}
      <ConfirmModal
        visible={finishModalVisible}
        title="¿Finalizar este evento?"
        message={`Se cerrará el evento "${balance.event.name}". El stock sobrante (${balance.totalRemaining} botellas) queda en tu stock general ya que nunca fue descontado.`}
        confirmLabel="Sí, finalizar evento"
        cancelLabel="No, mantener en curso"
        onConfirm={handleFinishEvent}
        onCancel={() => setFinishModalVisible(false)}
      />

      {/* Modal Agregar Más Stock al Evento */}
      <Modal
        visible={addStockModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setAddStockModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Llevar más botellas al evento</Text>
            <Text style={styles.modalSubtitle}>
              Sabor: <Text style={styles.bold}>{selectedStockItem?.flavor_name}</Text>
              {'\n'}
              Tamaño: <Text style={styles.bold}>{selectedStockItem?.size === 'GRANDE' ? 'Grande' : 'Chica'}</Text>
            </Text>

            <QuantityStepper
              label="¿Cuántas botellas extras llevás?"
              value={extraQuantity}
              min={1}
              onChange={setExtraQuantity}
            />

            <View style={styles.modalActions}>
              <BigButton
                label="Confirmar"
                variant="success"
                icon="check"
                onPress={handleAddExtraStock}
              />
              <BigButton
                label="Cancelar"
                variant="outline"
                onPress={() => setAddStockModalVisible(false)}
              />
            </View>
          </View>
        </View>
      </Modal>
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
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: Theme.typography.bodyLarge,
    color: Theme.colors.textMuted,
  },
  headerCard: {
    padding: 18,
    marginBottom: 14,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  eventTitle: {
    fontSize: Theme.typography.titleLarge,
    fontWeight: 'bold',
    color: Theme.colors.text,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginLeft: 8,
  },
  statusBadgeText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 12,
  },
  eventDateText: {
    fontSize: Theme.typography.bodyMedium,
    color: Theme.colors.textMuted,
    marginTop: 4,
    marginBottom: 12,
  },
  liveMetrics: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: Theme.sizes.borderRadius,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#00000015',
    alignItems: 'center',
  },
  liveMetricBox: {
    flex: 1,
    alignItems: 'center',
  },
  liveMetricLabel: {
    fontSize: 13,
    color: Theme.colors.textMuted,
    fontWeight: '600',
  },
  liveMetricVal: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Theme.colors.text,
    marginTop: 2,
  },
  liveMetricDivider: {
    width: 1,
    height: 36,
    backgroundColor: '#00000015',
  },
  actionBtn: {
    marginVertical: 6,
  },
  cardSection: {
    marginTop: 12,
    padding: 16,
  },
  cardSectionTitle: {
    fontSize: Theme.typography.titleMedium,
    fontWeight: 'bold',
    color: Theme.colors.text,
  },
  cardSectionSubtitle: {
    fontSize: Theme.typography.bodyMedium,
    color: Theme.colors.textMuted,
    marginTop: 2,
    marginBottom: 12,
  },
  stockItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#00000010',
  },
  stockItemFlavor: {
    fontSize: Theme.typography.bodyLarge,
    fontWeight: 'bold',
    color: Theme.colors.text,
  },
  stockItemDetail: {
    fontSize: 14,
    color: Theme.colors.textMuted,
    marginTop: 2,
  },
  stockItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  remainingPill: {
    backgroundColor: Theme.colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  remainingPillText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Theme.colors.primaryDark,
  },
  addMoreMiniBtn: {
    minHeight: 40,
    width: 44,
    paddingHorizontal: 0,
    paddingVertical: 0,
    marginLeft: 8,
  },
  exportBtn: {
    marginVertical: 6,
  },
  emptySalesText: {
    fontSize: Theme.typography.bodyMedium,
    color: Theme.colors.textMuted,
    marginVertical: 10,
  },
  saleItemRow: {
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#00000010',
  },
  saleItemTotal: {
    fontSize: Theme.typography.bodyLarge,
    fontWeight: 'bold',
    color: Theme.colors.primaryDark,
  },
  saleItemDate: {
    fontSize: 13,
    color: Theme.colors.textMuted,
  },
  saleItemLines: {
    fontSize: 14,
    color: Theme.colors.text,
    marginTop: 2,
  },
  finishBtn: {
    marginTop: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: '#00000080',
    justifyContent: 'center',
    padding: 16,
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderRadius: Theme.sizes.cardRadius,
    padding: 20,
    elevation: 8,
  },
  modalTitle: {
    fontSize: Theme.typography.titleLarge,
    fontWeight: 'bold',
    color: Theme.colors.text,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: Theme.typography.bodyLarge,
    color: Theme.colors.textMuted,
    textAlign: 'center',
    marginVertical: 8,
  },
  bold: {
    fontWeight: 'bold',
    color: Theme.colors.text,
  },
  modalActions: {
    marginTop: 14,
  },
});
