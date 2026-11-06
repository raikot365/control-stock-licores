// src/app/(tabs)/stock.tsx
import React, { useCallback, useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BigButton } from '@/components/BigButton';
import { Card } from '@/components/Card';
import { QuantityStepper } from '@/components/QuantityStepper';
import { BottleSize, FlavorWithStock, StockSummary } from '@/db/types';
import { StockService } from '@/services/stockService';
import { Theme } from '@/theme';
import { formatBottlesCount } from '@/utils/format';

export default function StockScreen() {
  const [flavors, setFlavors] = useState<FlavorWithStock[]>([]);
  const [summary, setSummary] = useState<StockSummary>({
    totalBottles: 0,
    totalGrande: 0,
    totalChica: 0,
    lowStockCount: 0,
    outOfStockCount: 0,
  });
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Modal para Cargar o Ajustar Stock
  const [stockModalVisible, setStockModalVisible] = useState(false);
  const [stockModalMode, setStockModalMode] = useState<'CARGAR' | 'AJUSTAR'>('CARGAR');
  const [selectedFlavor, setSelectedFlavor] = useState<FlavorWithStock | null>(null);
  const [selectedSize, setSelectedSize] = useState<BottleSize>('GRANDE');
  const [stockQuantity, setStockQuantity] = useState(1);
  const [adjustmentNote, setAdjustmentNote] = useState('');

  // Modal para Nuevo Sabor
  const [flavorModalVisible, setFlavorModalVisible] = useState(false);
  const [newFlavorName, setNewFlavorName] = useState('');
  const [flavorError, setFlavorError] = useState('');

  const loadData = useCallback(() => {
    try {
      const list = StockService.getFlavorsWithStock(false);
      setFlavors(list);
      const sum = StockService.getStockSummary();
      setSummary(sum);
    } catch (e) {
      console.error('Error cargando stock:', e);
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

  const openAddStockModal = (flavor: FlavorWithStock, size: BottleSize) => {
    setSelectedFlavor(flavor);
    setSelectedSize(size);
    setStockModalMode('CARGAR');
    setStockQuantity(1);
    setAdjustmentNote('');
    setStockModalVisible(true);
  };

  const openAdjustStockModal = (flavor: FlavorWithStock, size: BottleSize) => {
    setSelectedFlavor(flavor);
    setSelectedSize(size);
    setStockModalMode('AJUSTAR');
    const currentQty = size === 'GRANDE' ? flavor.grandeQty : flavor.chicaQty;
    setStockQuantity(currentQty);
    setAdjustmentNote('');
    setStockModalVisible(true);
  };

  const handleSaveStock = () => {
    if (!selectedFlavor) return;
    try {
      if (stockModalMode === 'CARGAR') {
        StockService.addStock(selectedFlavor.id, selectedSize, stockQuantity);
      } else {
        StockService.adjustStock(
          selectedFlavor.id,
          selectedSize,
          stockQuantity,
          adjustmentNote.trim() || undefined
        );
      }
      setStockModalVisible(false);
      loadData();
    } catch (e: any) {
      alert(e.message || 'Error al guardar stock');
    }
  };

  const handleCreateFlavor = () => {
    if (!newFlavorName.trim()) {
      setFlavorError('Escribí el nombre del sabor');
      return;
    }
    try {
      StockService.addFlavor(newFlavorName.trim());
      setFlavorModalVisible(false);
      setNewFlavorName('');
      setFlavorError('');
      loadData();
    } catch (e: any) {
      setFlavorError(e.message || 'Error al guardar el sabor');
    }
  };

  return (
    <View style={styles.container}>
      {/* Barra fija de Resumen Superior */}
      <View style={styles.topSummaryBar}>
        <View style={styles.topSummaryItem}>
          <Text style={styles.topSummaryValue}>{summary.totalBottles}</Text>
          <Text style={styles.topSummaryLabel}>Total Botellas</Text>
        </View>
        <View style={styles.topDivider} />
        <View style={styles.topSummaryItem}>
          <Text style={styles.topSummaryValue}>{summary.totalGrande}</Text>
          <Text style={styles.topSummaryLabel}>Grandes</Text>
        </View>
        <View style={styles.topDivider} />
        <View style={styles.topSummaryItem}>
          <Text style={styles.topSummaryValue}>{summary.totalChica}</Text>
          <Text style={styles.topSummaryLabel}>Chicas</Text>
        </View>
      </View>

      {/* Botón para Agregar Sabor */}
      <View style={styles.buttonWrapper}>
        <BigButton
          label="+ Agregar Nuevo Sabor"
          variant="secondary"
          icon="plus-circle"
          onPress={() => {
            setFlavorError('');
            setNewFlavorName('');
            setFlavorModalVisible(true);
          }}
        />
      </View>

      {/* Lista de Sabores y Botellas */}
      <FlatList
        data={flavors}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No hay sabores cargados aún.</Text>
          </View>
        }
        renderItem={({ item }) => {
          const isLow = item.totalQty > 0 && item.totalQty <= 2;
          const isZero = item.totalQty === 0;

          return (
            <Card variant={isZero ? 'danger' : isLow ? 'warning' : 'default'} style={styles.flavorCard}>
              <View style={styles.flavorHeader}>
                <View style={styles.flavorTitleContainer}>
                  <Text style={styles.flavorName}>{item.name}</Text>
                  {isZero ? (
                    <Text style={styles.badgeZero}>SIN STOCK</Text>
                  ) : isLow ? (
                    <Text style={styles.badgeLow}>STOCK BAJO</Text>
                  ) : null}
                </View>
                <Text style={styles.flavorTotal}>{item.totalQty} botellas</Text>
              </View>

              {/* Botella Grande */}
              <View style={styles.bottleRow}>
                <View style={styles.bottleInfo}>
                  <Text style={styles.bottleSizeName}>Botella Grande</Text>
                  <Text style={styles.bottleStockCount}>
                    {formatBottlesCount(item.grandeQty, 'GRANDE')}
                  </Text>
                </View>

                <View style={styles.bottleActionBtns}>
                  <Pressable
                    style={styles.loadMiniBtn}
                    onPress={() => openAddStockModal(item, 'GRANDE')}
                    accessibilityRole="button"
                    accessibilityLabel={`Cargar grandes de ${item.name}`}
                  >
                    <MaterialCommunityIcons name="plus" size={24} color="#FFFFFF" />
                    <Text style={styles.loadMiniBtnText}>Cargar</Text>
                  </Pressable>

                  <Pressable
                    style={styles.adjustMiniBtn}
                    onPress={() => openAdjustStockModal(item, 'GRANDE')}
                    accessibilityRole="button"
                    accessibilityLabel={`Ajustar grandes de ${item.name}`}
                  >
                    <MaterialCommunityIcons name="pencil-outline" size={20} color={Theme.colors.textMuted} />
                  </Pressable>
                </View>
              </View>

              {/* Botella Chica */}
              <View style={styles.bottleRow}>
                <View style={styles.bottleInfo}>
                  <Text style={styles.bottleSizeName}>Botella Chica</Text>
                  <Text style={styles.bottleStockCount}>
                    {formatBottlesCount(item.chicaQty, 'CHICA')}
                  </Text>
                </View>

                <View style={styles.bottleActionBtns}>
                  <Pressable
                    style={styles.loadMiniBtn}
                    onPress={() => openAddStockModal(item, 'CHICA')}
                    accessibilityRole="button"
                    accessibilityLabel={`Cargar chicas de ${item.name}`}
                  >
                    <MaterialCommunityIcons name="plus" size={24} color="#FFFFFF" />
                    <Text style={styles.loadMiniBtnText}>Cargar</Text>
                  </Pressable>

                  <Pressable
                    style={styles.adjustMiniBtn}
                    onPress={() => openAdjustStockModal(item, 'CHICA')}
                    accessibilityRole="button"
                    accessibilityLabel={`Ajustar chicas de ${item.name}`}
                  >
                    <MaterialCommunityIcons name="pencil-outline" size={20} color={Theme.colors.textMuted} />
                  </Pressable>
                </View>
              </View>
            </Card>
          );
        }}
      />

      {/* Modal Cargar / Ajustar Stock */}
      <Modal
        visible={stockModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setStockModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>
              {stockModalMode === 'CARGAR' ? 'Cargar Botellas' : 'Ajuste de Stock'}
            </Text>

            <Text style={styles.modalSubtitle}>
              Sabor: <Text style={styles.bold}>{selectedFlavor?.name}</Text>
              {'\n'}
              Tamaño: <Text style={styles.bold}>{selectedSize === 'GRANDE' ? 'Botella Grande' : 'Botella Chica'}</Text>
            </Text>

            <QuantityStepper
              label={stockModalMode === 'CARGAR' ? '¿Cuántas botellas vas a sumar?' : 'Cantidad real en el estante:'}
              value={stockQuantity}
              min={stockModalMode === 'CARGAR' ? 1 : 0}
              onChange={setStockQuantity}
            />

            {stockModalMode === 'AJUSTAR' && (
              <View style={styles.inputWrapper}>
                <Text style={styles.inputLabel}>Motivo del ajuste (opcional):</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Ej: Se rompió 1 botella, regalo, conteo..."
                  placeholderTextColor="#999"
                  value={adjustmentNote}
                  onChangeText={setAdjustmentNote}
                />
              </View>
            )}

            <View style={styles.modalActions}>
              <BigButton
                label={stockModalMode === 'CARGAR' ? 'Confirmar Carga' : 'Guardar Ajuste'}
                variant="success"
                icon="check-circle"
                onPress={handleSaveStock}
              />
              <BigButton
                label="Cancelar"
                variant="outline"
                onPress={() => setStockModalVisible(false)}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal Nuevo Sabor */}
      <Modal
        visible={flavorModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setFlavorModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Agregar Nuevo Sabor</Text>
            <Text style={styles.modalSubtitle}>
              Ingresá el nombre del licor (por ejemplo: Arándanos, Maracuyá, Menta)
            </Text>

            <TextInput
              style={[styles.textInput, styles.flavorInput]}
              placeholder="Nombre del sabor"
              placeholderTextColor="#999"
              value={newFlavorName}
              onChangeText={(text) => {
                setNewFlavorName(text);
                if (flavorError) setFlavorError('');
              }}
              autoFocus
            />

            {flavorError ? <Text style={styles.errorText}>{flavorError}</Text> : null}

            <View style={styles.modalActions}>
              <BigButton
                label="Crear Sabor"
                variant="primary"
                icon="check"
                onPress={handleCreateFlavor}
              />
              <BigButton
                label="Cancelar"
                variant="outline"
                onPress={() => setFlavorModalVisible(false)}
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  topSummaryBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
    elevation: 2,
  },
  topSummaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  topDivider: {
    width: 1,
    height: '80%',
    backgroundColor: Theme.colors.border,
  },
  topSummaryValue: {
    fontSize: 26,
    fontWeight: 'bold',
    color: Theme.colors.primary,
  },
  topSummaryLabel: {
    fontSize: 13,
    color: Theme.colors.textMuted,
    fontWeight: '600',
  },
  buttonWrapper: {
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  flavorCard: {
    marginVertical: 6,
    padding: 14,
  },
  flavorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#00000010',
    paddingBottom: 6,
  },
  flavorTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  flavorName: {
    fontSize: Theme.typography.titleMedium,
    fontWeight: 'bold',
    color: Theme.colors.text,
  },
  badgeZero: {
    marginLeft: 8,
    backgroundColor: Theme.colors.danger,
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeLow: {
    marginLeft: 8,
    backgroundColor: Theme.colors.warning,
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  flavorTotal: {
    fontSize: Theme.typography.bodyLarge,
    fontWeight: 'bold',
    color: Theme.colors.primary,
  },
  bottleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderTopWidth: 0.5,
    borderTopColor: '#00000010',
  },
  bottleInfo: {
    flex: 1,
  },
  bottleSizeName: {
    fontSize: Theme.typography.bodyMedium,
    color: Theme.colors.textMuted,
  },
  bottleStockCount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Theme.colors.text,
  },
  bottleActionBtns: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loadMiniBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.success,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
  },
  loadMiniBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  adjustMiniBtn: {
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Theme.colors.borderBold,
    backgroundColor: '#FFFFFF',
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 40,
  },
  emptyText: {
    fontSize: Theme.typography.bodyLarge,
    color: Theme.colors.textMuted,
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
    marginVertical: 10,
    lineHeight: 24,
  },
  bold: {
    fontWeight: 'bold',
    color: Theme.colors.text,
  },
  inputWrapper: {
    marginTop: 8,
  },
  inputLabel: {
    fontSize: Theme.typography.bodyMedium,
    color: Theme.colors.textMuted,
    marginBottom: 4,
  },
  textInput: {
    borderWidth: 1.5,
    borderColor: Theme.colors.borderBold,
    borderRadius: Theme.sizes.borderRadius,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: Theme.typography.bodyLarge,
    color: Theme.colors.text,
    backgroundColor: '#FAFAFA',
  },
  flavorInput: {
    marginVertical: 12,
  },
  errorText: {
    color: Theme.colors.danger,
    fontSize: 15,
    marginBottom: 10,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  modalActions: {
    marginTop: 14,
  },
});
