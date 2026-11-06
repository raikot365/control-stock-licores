// src/app/combos.tsx
import React, { useCallback, useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BigButton } from '@/components/BigButton';
import { Card } from '@/components/Card';
import { ConfirmModal } from '@/components/ConfirmModal';
import { QuantityStepper } from '@/components/QuantityStepper';
import { BottleSize, Combo } from '@/db/types';
import { ComboService } from '@/services/comboService';
import { Theme } from '@/theme';
import { formatMoney } from '@/utils/format';

export default function CombosScreen() {
  const [combos, setCombos] = useState<Combo[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Modal Crear / Editar Combo
  const [modalVisible, setModalVisible] = useState(false);
  const [editingCombo, setEditingCombo] = useState<Combo | null>(null);
  const [comboName, setComboName] = useState('');
  const [comboPrice, setComboPrice] = useState('');
  const [grandeQty, setGrandeQty] = useState(0);
  const [chicaQty, setChicaQty] = useState(2);
  const [errorMsg, setErrorMsg] = useState('');

  // Modal Eliminar
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [comboToDelete, setComboToDelete] = useState<Combo | null>(null);

  const loadData = useCallback(() => {
    try {
      const list = ComboService.getCombos(false);
      setCombos(list);
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

  const openCreateModal = () => {
    setEditingCombo(null);
    setComboName('');
    setComboPrice('');
    setGrandeQty(0);
    setChicaQty(2);
    setErrorMsg('');
    setModalVisible(true);
  };

  const openEditModal = (combo: Combo) => {
    setEditingCombo(combo);
    setComboName(combo.name);
    setComboPrice(combo.price.toString());
    const g = combo.items.find((i) => i.size === 'GRANDE')?.quantity || 0;
    const c = combo.items.find((i) => i.size === 'CHICA')?.quantity || 0;
    setGrandeQty(g);
    setChicaQty(c);
    setErrorMsg('');
    setModalVisible(true);
  };

  const handleSaveCombo = () => {
    if (!comboName.trim()) {
      setErrorMsg('Ingresá el nombre del combo');
      return;
    }
    const priceNum = parseFloat(comboPrice.replace(/\./g, ''));
    if (isNaN(priceNum) || priceNum <= 0) {
      setErrorMsg('Ingresá un precio válido para el combo');
      return;
    }
    if (grandeQty === 0 && chicaQty === 0) {
      setErrorMsg('El combo debe incluir al menos una botella');
      return;
    }

    const items: { size: BottleSize; quantity: number }[] = [];
    if (grandeQty > 0) items.push({ size: 'GRANDE', quantity: grandeQty });
    if (chicaQty > 0) items.push({ size: 'CHICA', quantity: chicaQty });

    try {
      if (editingCombo) {
        ComboService.updateCombo(editingCombo.id, comboName.trim(), priceNum, 1, items);
      } else {
        ComboService.createCombo(comboName.trim(), priceNum, items);
      }
      setModalVisible(false);
      loadData();
    } catch (e: any) {
      setErrorMsg(e.message || 'Error al guardar el combo');
    }
  };

  const handleDeleteCombo = () => {
    if (!comboToDelete) return;
    try {
      const res = ComboService.deleteOrDeactivateCombo(comboToDelete.id);
      setDeleteModalVisible(false);
      loadData();
      if (res.action === 'deactivated') {
        alert('El combo tenía ventas históricas asociadas, por lo que fue desactivado del menú para preservar las estadísticas.');
      }
    } catch (e: any) {
      alert(e.message || 'Error al eliminar combo');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.topBtnWrapper}>
        <BigButton
          label="+ Crear Nuevo Combo"
          sublabel="Ejemplo: 2 chicas por un precio especial"
          icon="plus-circle"
          variant="secondary"
          onPress={openCreateModal}
        />
      </View>

      <FlatList
        data={combos}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No hay combos configurados.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <Card style={styles.comboCard}>
            <View style={styles.comboHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.comboTitle}>{item.name}</Text>
                <Text style={styles.comboPrice}>{formatMoney(item.price)}</Text>
              </View>

              <View style={styles.comboActions}>
                <Pressable
                  style={styles.iconBtn}
                  onPress={() => openEditModal(item)}
                  accessibilityRole="button"
                  accessibilityLabel="Editar combo"
                >
                  <MaterialCommunityIcons name="pencil-outline" size={24} color={Theme.colors.primary} />
                </Pressable>

                <Pressable
                  style={styles.iconBtn}
                  onPress={() => {
                    setComboToDelete(item);
                    setDeleteModalVisible(true);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="Eliminar combo"
                >
                  <MaterialCommunityIcons name="trash-can-outline" size={24} color={Theme.colors.danger} />
                </Pressable>
              </View>
            </View>

            <View style={styles.compositionBox}>
              <Text style={styles.compositionLabel}>Incluye:</Text>
              <Text style={styles.compositionValue}>
                {item.items
                  .map((it) => `${it.quantity} ${it.size === 'GRANDE' ? 'Grandes' : 'Chicas'}`)
                  .join(' + ')}
              </Text>
              <Text style={styles.flavorNote}>
                * Los sabores se eligen en el momento de registrar cada venta.
              </Text>
            </View>
          </Card>
        )}
      />

      {/* Modal Crear / Editar */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <ScrollView contentContainerStyle={styles.modalScroll}>
            <View style={styles.modalSheet}>
              <Text style={styles.modalTitle}>
                {editingCombo ? 'Editar Combo' : 'Nuevo Combo'}
              </Text>

              <Text style={styles.inputLabel}>Nombre del combo:</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Ej: Dúo Chicas, Promo Fiesta..."
                placeholderTextColor="#999"
                value={comboName}
                onChangeText={(t) => {
                  setComboName(t);
                  if (errorMsg) setErrorMsg('');
                }}
              />

              <Text style={styles.inputLabel}>Precio total del combo ($):</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Ej: 9000"
                keyboardType="numeric"
                placeholderTextColor="#999"
                value={comboPrice}
                onChangeText={(t) => {
                  setComboPrice(t);
                  if (errorMsg) setErrorMsg('');
                }}
              />

              <Text style={[styles.inputLabel, { marginTop: 14 }]}>
                Composición de botellas del combo:
              </Text>

              <QuantityStepper
                label="Botellas Grandes:"
                value={grandeQty}
                min={0}
                onChange={setGrandeQty}
              />

              <QuantityStepper
                label="Botellas Chicas:"
                value={chicaQty}
                min={0}
                onChange={setChicaQty}
              />

              {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}

              <View style={styles.modalButtons}>
                <BigButton
                  label="Guardar Combo"
                  variant="success"
                  icon="check-circle"
                  onPress={handleSaveCombo}
                />
                <BigButton
                  label="Cancelar"
                  variant="outline"
                  onPress={() => setModalVisible(false)}
                />
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Modal Confirmar Eliminación */}
      <ConfirmModal
        visible={deleteModalVisible}
        title="¿Eliminar este combo?"
        message={`¿Estás seguro de que querés borrar el combo "${comboToDelete?.name}"?`}
        confirmLabel="Sí, borrar combo"
        cancelLabel="No, cancelar"
        isDestructive={true}
        onConfirm={handleDeleteCombo}
        onCancel={() => setDeleteModalVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  topBtnWrapper: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  comboCard: {
    marginVertical: 6,
    padding: 16,
  },
  comboHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  comboTitle: {
    fontSize: Theme.typography.titleMedium,
    fontWeight: 'bold',
    color: Theme.colors.text,
  },
  comboPrice: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Theme.colors.primary,
    marginTop: 2,
  },
  comboActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBtn: {
    padding: 8,
    marginLeft: 6,
    borderRadius: 8,
    backgroundColor: '#FAFAFA',
    borderWidth: 1,
    borderColor: Theme.colors.borderBold,
  },
  compositionBox: {
    backgroundColor: '#FAFAFA',
    padding: 12,
    borderRadius: Theme.sizes.borderRadius,
    borderWidth: 1,
    borderColor: '#00000010',
  },
  compositionLabel: {
    fontSize: 13,
    color: Theme.colors.textMuted,
  },
  compositionValue: {
    fontSize: Theme.typography.bodyLarge,
    fontWeight: 'bold',
    color: Theme.colors.text,
    marginVertical: 2,
  },
  flavorNote: {
    fontSize: 13,
    color: Theme.colors.textMuted,
    fontStyle: 'italic',
    marginTop: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: Theme.typography.bodyLarge,
    color: Theme.colors.textMuted,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: '#00000080',
    justifyContent: 'center',
  },
  modalScroll: {
    padding: 16,
    justifyContent: 'center',
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
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: Theme.typography.bodyLarge,
    fontWeight: 'bold',
    color: Theme.colors.text,
    marginTop: 8,
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
  errorText: {
    color: Theme.colors.danger,
    fontSize: 15,
    fontWeight: 'bold',
    marginTop: 10,
    textAlign: 'center',
  },
  modalButtons: {
    marginTop: 16,
  },
});
