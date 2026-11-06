// src/app/(tabs)/vender.tsx
import React, { useCallback, useState } from 'react';
import {
  Modal,
  Pressable,
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
import { QuantityStepper } from '@/components/QuantityStepper';
import { BottleSize, CartItem, Combo, FlavorWithStock, LiquorEvent } from '@/db/types';
import { ComboService } from '@/services/comboService';
import { EventService } from '@/services/eventService';
import { PriceService } from '@/services/priceService';
import { SalesService } from '@/services/salesService';
import { StockService } from '@/services/stockService';
import { Theme } from '@/theme';
import { formatMoney } from '@/utils/format';

export default function VenderScreen() {
  // Estados de datos
  const [flavors, setFlavors] = useState<FlavorWithStock[]>([]);
  const [combos, setCombos] = useState<Combo[]>([]);
  const [activeEvents, setActiveEvents] = useState<LiquorEvent[]>([]);
  const [prices, setPrices] = useState<Record<BottleSize, number>>({ GRANDE: 8000, CHICA: 5000 });

  // Ubicación de venta: null = particular, id = evento
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'Efectivo' | 'Transferencia'>('Efectivo');
  const [saleNote, setSaleNote] = useState('');

  // Carrito de compras
  const [cart, setCart] = useState<CartItem[]>([]);

  // Modales para agregar al carrito
  const [bottleModalVisible, setBottleModalVisible] = useState(false);
  const [selectedFlavorId, setSelectedFlavorId] = useState<number | null>(null);
  const [selectedSize, setSelectedSize] = useState<BottleSize>('CHICA');
  const [bottleQuantity, setBottleQuantity] = useState(1);

  // Modal combo
  const [comboModalVisible, setComboModalVisible] = useState(false);
  const [selectedCombo, setSelectedCombo] = useState<Combo | null>(null);
  const [comboSelections, setComboSelections] = useState<
    { size: BottleSize; flavorId: number; flavorName: string }[]
  >([]);

  // Confirmación exitosa
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const loadData = useCallback(() => {
    try {
      const activeFlavors = StockService.getFlavorsWithStock(false);
      setFlavors(activeFlavors);
      setCombos(ComboService.getCombos(false));
      setActiveEvents(EventService.getActiveEvents());
      setPrices(PriceService.getPrices());
    } catch (e) {
      console.error('Error al cargar datos para venta:', e);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const totalCart = cart.reduce((acc, item) => {
    return acc + (item.type === 'BOTTLE' ? item.lineTotal : item.price);
  }, 0);

  // Agregar botella suelta
  const handleOpenBottleModal = () => {
    if (flavors.length > 0) {
      setSelectedFlavorId(flavors[0].id);
    }
    setSelectedSize('CHICA');
    setBottleQuantity(1);
    setBottleModalVisible(true);
  };

  const handleAddBottleToCart = () => {
    if (!selectedFlavorId) return;
    const flavor = flavors.find((f) => f.id === selectedFlavorId);
    if (!flavor) return;

    const unitPrice = prices[selectedSize];
    const lineTotal = unitPrice * bottleQuantity;

    const newItem: CartItem = {
      type: 'BOTTLE',
      cartId: `bottle_${Date.now()}_${Math.random()}`,
      flavorId: flavor.id,
      flavorName: flavor.name,
      size: selectedSize,
      quantity: bottleQuantity,
      unitPrice,
      lineTotal,
    };

    setCart((prev) => [...prev, newItem]);
    setBottleModalVisible(false);
  };

  // Agregar combo
  const handleOpenComboModal = (combo: Combo) => {
    setSelectedCombo(combo);
    // Armar lista de selección de sabores según items del combo
    const selections: { size: BottleSize; flavorId: number; flavorName: string }[] = [];
    const defaultFlavor = flavors[0] || { id: 1, name: 'Sabor' };

    for (const item of combo.items) {
      for (let i = 0; i < item.quantity; i++) {
        selections.push({
          size: item.size,
          flavorId: defaultFlavor.id,
          flavorName: defaultFlavor.name,
        });
      }
    }

    setComboSelections(selections);
    setComboModalVisible(true);
  };

  const handleAddComboToCart = () => {
    if (!selectedCombo) return;

    const newItem: CartItem = {
      type: 'COMBO',
      cartId: `combo_${Date.now()}_${Math.random()}`,
      comboId: selectedCombo.id,
      comboName: selectedCombo.name,
      price: selectedCombo.price,
      bottles: comboSelections,
    };

    setCart((prev) => [...prev, newItem]);
    setComboModalVisible(false);
  };

  const handleRemoveItem = (cartId: string) => {
    setCart((prev) => prev.filter((item) => item.cartId !== cartId));
  };

  const handleConfirmSale = () => {
    if (cart.length === 0) return;
    try {
      SalesService.createSale({
        eventId: selectedEventId,
        paymentMethod,
        note: saleNote.trim() || undefined,
        cart,
      });

      // Mensaje de éxito claro
      const totalBottles = cart.reduce((acc, item) => {
        return acc + (item.type === 'BOTTLE' ? item.quantity : item.bottles.length);
      }, 0);

      setSuccessMessage(
        `¡Venta registrada con éxito!\nCobraste ${formatMoney(totalCart)} por ${totalBottles} ${totalBottles === 1 ? 'botella' : 'botellas'}. El stock se actualizó automáticamente.`
      );
      setCart([]);
      setSaleNote('');
      loadData();
    } catch (e: any) {
      alert(e.message || 'Error al registrar la venta');
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* 1. ¿Dónde vendés? */}
      <Card style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>1. ¿Dónde estás vendiendo?</Text>
        <View style={styles.locationRow}>
          <Pressable
            style={[
              styles.locationOption,
              selectedEventId === null && styles.locationOptionSelected,
            ]}
            onPress={() => setSelectedEventId(null)}
          >
            <MaterialCommunityIcons
              name="home-outline"
              size={24}
              color={selectedEventId === null ? Theme.colors.primary : Theme.colors.textMuted}
            />
            <Text
              style={[
                styles.locationText,
                selectedEventId === null && styles.locationTextSelected,
              ]}
            >
              Venta Particular
            </Text>
          </Pressable>

          {activeEvents.map((ev) => (
            <Pressable
              key={ev.id}
              style={[
                styles.locationOption,
                selectedEventId === ev.id && styles.locationOptionSelected,
              ]}
              onPress={() => setSelectedEventId(ev.id)}
            >
              <MaterialCommunityIcons
                name="calendar-star"
                size={24}
                color={selectedEventId === ev.id ? Theme.colors.primary : Theme.colors.textMuted}
              />
              <Text
                style={[
                  styles.locationText,
                  selectedEventId === ev.id && styles.locationTextSelected,
                ]}
                numberOfLines={1}
              >
                {ev.name}
              </Text>
            </Pressable>
          ))}
        </View>
      </Card>

      {/* 2. ¿Qué vendés? Botella o Combo */}
      <Card style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>2. Elegir qué vas a vender</Text>
        <View style={styles.addItemButtonsRow}>
          <BigButton
            label="+ Botella Suelta"
            sublabel={`Grande ${formatMoney(prices.GRANDE)} | Chica ${formatMoney(prices.CHICA)}`}
            icon="bottle-wine-outline"
            variant="primary"
            onPress={handleOpenBottleModal}
            style={styles.halfBtn}
          />
        </View>

        {combos.length > 0 && (
          <View style={styles.comboListContainer}>
            <Text style={styles.comboSubtitle}>O elegí un combo:</Text>
            {combos.map((c) => (
              <BigButton
                key={c.id}
                label={`${c.name} (${formatMoney(c.price)})`}
                sublabel={c.items.map((it) => `${it.quantity} ${it.size === 'GRANDE' ? 'grandes' : 'chicas'}`).join(' + ')}
                icon="tag-outline"
                variant="secondary"
                onPress={() => handleOpenComboModal(c)}
                style={styles.comboBtn}
              />
            ))}
          </View>
        )}
      </Card>

      {/* 3. Carrito de Ventas */}
      <Card variant="highlight" style={styles.sectionCard}>
        <View style={styles.cartHeader}>
          <Text style={styles.sectionTitle}>3. Carrito de Venta</Text>
          <Text style={styles.cartCountBadge}>
            {cart.length} {cart.length === 1 ? 'ítem' : 'ítems'}
          </Text>
        </View>

        {cart.length === 0 ? (
          <View style={styles.emptyCartBox}>
            <MaterialCommunityIcons name="cart-outline" size={48} color={Theme.colors.borderBold} />
            <Text style={styles.emptyCartText}>El carrito está vacío. Agregá botellas o combos arriba.</Text>
          </View>
        ) : (
          <View>
            {cart.map((item) => (
              <View key={item.cartId} style={styles.cartItemRow}>
                <View style={styles.cartItemInfo}>
                  {item.type === 'BOTTLE' ? (
                    <>
                      <Text style={styles.cartItemName}>
                        {item.quantity}x {item.flavorName} ({item.size === 'GRANDE' ? 'Grande' : 'Chica'})
                      </Text>
                      <Text style={styles.cartItemPrice}>
                        {formatMoney(item.unitPrice)} c/u = <Text style={styles.bold}>{formatMoney(item.lineTotal)}</Text>
                      </Text>
                    </>
                  ) : (
                    <>
                      <Text style={styles.cartItemName}>Combo: {item.comboName}</Text>
                      <Text style={styles.cartItemSubdetails}>
                        {item.bottles.map((b) => `${b.flavorName} (${b.size === 'GRANDE' ? 'Gde' : 'Ch'})`).join(' + ')}
                      </Text>
                      <Text style={styles.cartItemPrice}>Total: <Text style={styles.bold}>{formatMoney(item.price)}</Text></Text>
                    </>
                  )}
                </View>

                <Pressable
                  style={styles.removeBtn}
                  onPress={() => handleRemoveItem(item.cartId)}
                  accessibilityRole="button"
                  accessibilityLabel="Quitar del carrito"
                >
                  <MaterialCommunityIcons name="trash-can-outline" size={26} color={Theme.colors.danger} />
                </Pressable>
              </View>
            ))}

            {/* Total a Cobrar */}
            <View style={styles.totalBox}>
              <Text style={styles.totalLabel}>TOTAL A COBRAR:</Text>
              <Text style={styles.totalNumber}>{formatMoney(totalCart)}</Text>
            </View>

            {/* Forma de Pago */}
            <View style={styles.paymentMethodsRow}>
              <Pressable
                style={[
                  styles.paymentOption,
                  paymentMethod === 'Efectivo' && styles.paymentOptionSelected,
                ]}
                onPress={() => setPaymentMethod('Efectivo')}
              >
                <MaterialCommunityIcons
                  name="cash"
                  size={24}
                  color={paymentMethod === 'Efectivo' ? Theme.colors.success : Theme.colors.textMuted}
                />
                <Text
                  style={[
                    styles.paymentText,
                    paymentMethod === 'Efectivo' && styles.paymentTextSelected,
                  ]}
                >
                  Efectivo
                </Text>
              </Pressable>

              <Pressable
                style={[
                  styles.paymentOption,
                  paymentMethod === 'Transferencia' && styles.paymentOptionSelected,
                ]}
                onPress={() => setPaymentMethod('Transferencia')}
              >
                <MaterialCommunityIcons
                  name="bank-transfer"
                  size={24}
                  color={paymentMethod === 'Transferencia' ? Theme.colors.secondary : Theme.colors.textMuted}
                />
                <Text
                  style={[
                    styles.paymentText,
                    paymentMethod === 'Transferencia' && styles.paymentTextSelected,
                  ]}
                >
                  Transferencia
                </Text>
              </Pressable>
            </View>

            <TextInput
              style={styles.noteInput}
              placeholder="Nota opcional (ej: cliente, feria...)"
              placeholderTextColor="#999"
              value={saleNote}
              onChangeText={setSaleNote}
            />

            {/* Botón Confirmar Venta */}
            <BigButton
              label={`CONFIRMAR VENTA (${formatMoney(totalCart)})`}
              icon="check-circle"
              variant="success"
              onPress={handleConfirmSale}
              style={styles.confirmSaleBtn}
            />
          </View>
        )}
      </Card>

      {/* Modal Botella Suelta */}
      <Modal
        visible={bottleModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setBottleModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Agregar Botella</Text>

            {/* Selector de Sabor */}
            <Text style={styles.modalInputLabel}>Elegí el sabor:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.flavorPillsScroll}>
              {flavors.map((f) => (
                <Pressable
                  key={f.id}
                  style={[
                    styles.flavorPill,
                    selectedFlavorId === f.id && styles.flavorPillSelected,
                  ]}
                  onPress={() => setSelectedFlavorId(f.id)}
                >
                  <Text
                    style={[
                      styles.flavorPillText,
                      selectedFlavorId === f.id && styles.flavorPillTextSelected,
                    ]}
                  >
                    {f.name}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            {/* Selector de Tamaño */}
            <Text style={styles.modalInputLabel}>Elegí el tamaño:</Text>
            <View style={styles.sizeChoiceRow}>
              <Pressable
                style={[
                  styles.sizeChoiceBtn,
                  selectedSize === 'CHICA' && styles.sizeChoiceBtnSelected,
                ]}
                onPress={() => setSelectedSize('CHICA')}
              >
                <Text
                  style={[
                    styles.sizeChoiceText,
                    selectedSize === 'CHICA' && styles.sizeChoiceTextSelected,
                  ]}
                >
                  Chica ({formatMoney(prices.CHICA)})
                </Text>
              </Pressable>

              <Pressable
                style={[
                  styles.sizeChoiceBtn,
                  selectedSize === 'GRANDE' && styles.sizeChoiceBtnSelected,
                ]}
                onPress={() => setSelectedSize('GRANDE')}
              >
                <Text
                  style={[
                    styles.sizeChoiceText,
                    selectedSize === 'GRANDE' && styles.sizeChoiceTextSelected,
                  ]}
                >
                  Grande ({formatMoney(prices.GRANDE)})
                </Text>
              </Pressable>
            </View>

            {/* Cantidad */}
            <QuantityStepper
              label="Cantidad de botellas:"
              value={bottleQuantity}
              min={1}
              onChange={setBottleQuantity}
            />

            <View style={styles.modalActions}>
              <BigButton
                label={`Agregar al Carrito (${formatMoney(prices[selectedSize] * bottleQuantity)})`}
                variant="success"
                icon="cart-plus"
                onPress={handleAddBottleToCart}
              />
              <BigButton
                label="Cancelar"
                variant="outline"
                onPress={() => setBottleModalVisible(false)}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal Combo */}
      <Modal
        visible={comboModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setComboModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Armar Combo: {selectedCombo?.name}</Text>
            <Text style={styles.modalSubtitle}>Elegí el sabor de cada botella incluida:</Text>

            <ScrollView style={{ maxHeight: 300 }}>
              {comboSelections.map((sel, idx) => (
                <View key={idx} style={styles.comboBottlePicker}>
                  <Text style={styles.comboBottleIndex}>
                    Botella {idx + 1} ({sel.size === 'GRANDE' ? 'Grande' : 'Chica'}):
                  </Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.flavorPillsScroll}>
                    {flavors.map((fl) => (
                      <Pressable
                        key={fl.id}
                        style={[
                          styles.flavorPill,
                          sel.flavorId === fl.id && styles.flavorPillSelected,
                        ]}
                        onPress={() => {
                          const updated = [...comboSelections];
                          updated[idx] = { ...updated[idx], flavorId: fl.id, flavorName: fl.name };
                          setComboSelections(updated);
                        }}
                      >
                        <Text
                          style={[
                            styles.flavorPillText,
                            sel.flavorId === fl.id && styles.flavorPillTextSelected,
                          ]}
                        >
                          {fl.name}
                        </Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>
              ))}
            </ScrollView>

            <View style={styles.modalActions}>
              <BigButton
                label={`Agregar Combo al Carrito (${formatMoney(selectedCombo?.price || 0)})`}
                variant="success"
                icon="cart-plus"
                onPress={handleAddComboToCart}
              />
              <BigButton
                label="Cancelar"
                variant="outline"
                onPress={() => setComboModalVisible(false)}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal Mensaje de Éxito */}
      <Modal
        visible={!!successMessage}
        transparent
        animationType="fade"
        onRequestClose={() => setSuccessMessage(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={{ alignItems: 'center', marginBottom: 12 }}>
              <MaterialCommunityIcons name="check-circle" size={60} color={Theme.colors.success} />
            </View>
            <Text style={styles.successTitle}>¡Venta Registrada!</Text>
            <Text style={styles.successText}>{successMessage}</Text>
            <BigButton
              label="Aceptar"
              variant="success"
              onPress={() => setSuccessMessage(null)}
            />
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
  sectionCard: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: Theme.typography.titleMedium,
    fontWeight: 'bold',
    color: Theme.colors.text,
    marginBottom: 12,
  },
  locationRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  locationOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: Theme.sizes.borderRadius,
    borderWidth: 1.5,
    borderColor: Theme.colors.borderBold,
    backgroundColor: '#FFFFFF',
    marginBottom: 6,
  },
  locationOptionSelected: {
    borderColor: Theme.colors.primary,
    backgroundColor: Theme.colors.primaryLight,
  },
  locationText: {
    fontSize: Theme.typography.bodyMedium,
    color: Theme.colors.text,
    marginLeft: 6,
    fontWeight: '600',
  },
  locationTextSelected: {
    color: Theme.colors.primaryDark,
    fontWeight: 'bold',
  },
  addItemButtonsRow: {
    width: '100%',
  },
  halfBtn: {
    width: '100%',
  },
  comboListContainer: {
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#00000015',
    paddingTop: 10,
  },
  comboSubtitle: {
    fontSize: Theme.typography.bodyMedium,
    color: Theme.colors.textMuted,
    marginBottom: 6,
    fontWeight: '600',
  },
  comboBtn: {
    marginVertical: 4,
  },
  cartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  cartCountBadge: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Theme.colors.primary,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Theme.colors.primary,
  },
  emptyCartBox: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  emptyCartText: {
    fontSize: Theme.typography.bodyMedium,
    color: Theme.colors.textMuted,
    marginTop: 8,
    textAlign: 'center',
  },
  cartItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#00000015',
  },
  cartItemInfo: {
    flex: 1,
  },
  cartItemName: {
    fontSize: Theme.typography.bodyLarge,
    fontWeight: 'bold',
    color: Theme.colors.text,
  },
  cartItemSubdetails: {
    fontSize: 14,
    color: Theme.colors.textMuted,
    marginVertical: 2,
  },
  cartItemPrice: {
    fontSize: Theme.typography.bodyMedium,
    color: Theme.colors.textMuted,
    marginTop: 2,
  },
  bold: {
    fontWeight: 'bold',
    color: Theme.colors.text,
  },
  removeBtn: {
    padding: 8,
  },
  totalBox: {
    marginVertical: 14,
    alignItems: 'center',
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: Theme.sizes.borderRadius,
    borderWidth: 1.5,
    borderColor: Theme.colors.primary,
  },
  totalLabel: {
    fontSize: Theme.typography.bodyMedium,
    color: Theme.colors.textMuted,
    fontWeight: 'bold',
  },
  totalNumber: {
    fontSize: 40,
    fontWeight: '900',
    color: Theme.colors.primaryDark,
  },
  paymentMethodsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  paymentOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: Theme.sizes.borderRadius,
    borderWidth: 1.5,
    borderColor: Theme.colors.borderBold,
    backgroundColor: '#FFFFFF',
  },
  paymentOptionSelected: {
    borderColor: Theme.colors.primary,
    backgroundColor: Theme.colors.primaryLight,
  },
  paymentText: {
    fontSize: Theme.typography.bodyLarge,
    fontWeight: 'bold',
    color: Theme.colors.text,
    marginLeft: 8,
  },
  paymentTextSelected: {
    color: Theme.colors.primaryDark,
  },
  noteInput: {
    borderWidth: 1.5,
    borderColor: Theme.colors.borderBold,
    borderRadius: Theme.sizes.borderRadius,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: Theme.typography.bodyMedium,
    backgroundColor: '#FFFFFF',
    marginBottom: 12,
  },
  confirmSaleBtn: {
    minHeight: 64,
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
    marginBottom: 6,
  },
  modalSubtitle: {
    fontSize: Theme.typography.bodyLarge,
    color: Theme.colors.textMuted,
    textAlign: 'center',
    marginBottom: 12,
  },
  modalInputLabel: {
    fontSize: Theme.typography.bodyLarge,
    fontWeight: 'bold',
    color: Theme.colors.text,
    marginTop: 10,
    marginBottom: 6,
  },
  flavorPillsScroll: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  flavorPill: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#F0F0F0',
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: Theme.colors.borderBold,
  },
  flavorPillSelected: {
    backgroundColor: Theme.colors.primary,
    borderColor: Theme.colors.primaryDark,
  },
  flavorPillText: {
    fontSize: 16,
    color: Theme.colors.text,
    fontWeight: '600',
  },
  flavorPillTextSelected: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  sizeChoiceRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  sizeChoiceBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: Theme.sizes.borderRadius,
    borderWidth: 1.5,
    borderColor: Theme.colors.borderBold,
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
  },
  sizeChoiceBtnSelected: {
    borderColor: Theme.colors.primary,
    backgroundColor: Theme.colors.primaryLight,
  },
  sizeChoiceText: {
    fontSize: Theme.typography.bodyLarge,
    color: Theme.colors.text,
    fontWeight: '600',
  },
  sizeChoiceTextSelected: {
    color: Theme.colors.primaryDark,
    fontWeight: 'bold',
  },
  modalActions: {
    marginTop: 14,
  },
  comboBottlePicker: {
    marginVertical: 6,
    padding: 8,
    backgroundColor: '#FAFAFA',
    borderRadius: 8,
  },
  comboBottleIndex: {
    fontSize: Theme.typography.bodyMedium,
    fontWeight: 'bold',
    color: Theme.colors.text,
    marginBottom: 4,
  },
  successTitle: {
    fontSize: Theme.typography.titleLarge,
    fontWeight: 'bold',
    color: Theme.colors.success,
    textAlign: 'center',
    marginBottom: 8,
  },
  successText: {
    fontSize: Theme.typography.bodyLarge,
    color: Theme.colors.text,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 26,
  },
});
