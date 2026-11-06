// src/db/types.ts

export type BottleSize = 'GRANDE' | 'CHICA';

export interface Flavor {
  id: number;
  name: string;
  active: number; // 1 o 0
  created_at: string;
}

export interface FlavorWithStock {
  id: number;
  name: string;
  active: number;
  grandeQty: number;
  chicaQty: number;
  totalQty: number;
}

export interface StockSummary {
  totalBottles: number;
  totalGrande: number;
  totalChica: number;
  lowStockCount: number;
  outOfStockCount: number;
}

export interface PriceRecord {
  size: BottleSize;
  price: number;
  updated_at: string;
}

export interface ComboItem {
  id?: number;
  combo_id?: number;
  size: BottleSize;
  quantity: number;
}

export interface Combo {
  id: number;
  name: string;
  price: number;
  active: number;
  created_at: string;
  items: ComboItem[];
}

export type EventStatus = 'PREPARADO' | 'EN_CURSO' | 'FINALIZADO';

export interface LiquorEvent {
  id: number;
  name: string;
  date: string;
  status: EventStatus;
  created_at: string;
  total_taken?: number;
  total_sold?: number;
  total_revenue?: number;
}

export interface EventStockItem {
  id: number;
  event_id: number;
  flavor_id: number;
  flavor_name: string;
  size: BottleSize;
  quantity_taken: number;
  quantity_sold: number;
  quantity_remaining: number;
}

export type SaleStatus = 'ACTIVA' | 'ANULADA';

export interface SaleLine {
  id?: number;
  sale_id?: number;
  combo_id?: number | null;
  combo_name?: string | null;
  flavor_id: number;
  flavor_name?: string;
  size: BottleSize;
  quantity: number;
  unit_price: number;
  line_total: number;
}

export interface Sale {
  id: number;
  event_id?: number | null;
  event_name?: string | null;
  total: number;
  payment_method?: string | null;
  note?: string | null;
  status: SaleStatus;
  created_at: string;
  lines?: SaleLine[];
}

export type StockMovementType = 'INGRESO' | 'VENTA' | 'AJUSTE' | 'ANULACION';

export interface StockMovement {
  id: number;
  flavor_id: number;
  flavor_name: string;
  size: BottleSize;
  quantity_delta: number;
  type: StockMovementType;
  note?: string | null;
  sale_id?: number | null;
  created_at: string;
}

export interface CartBottleItem {
  type: 'BOTTLE';
  cartId: string;
  flavorId: number;
  flavorName: string;
  size: BottleSize;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface CartComboItem {
  type: 'COMBO';
  cartId: string;
  comboId: number;
  comboName: string;
  price: number;
  bottles: {
    size: BottleSize;
    flavorId: number;
    flavorName: string;
  }[];
}

export type CartItem = CartBottleItem | CartComboItem;
