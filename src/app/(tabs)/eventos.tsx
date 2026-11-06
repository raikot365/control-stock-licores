// src/app/(tabs)/eventos.tsx
import React, { useCallback, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BigButton } from '@/components/BigButton';
import { Card } from '@/components/Card';
import { LiquorEvent } from '@/db/types';
import { EventService } from '@/services/eventService';
import { Theme } from '@/theme';
import { formatDateOnly, formatMoney } from '@/utils/format';

export default function EventosScreen() {
  const router = useRouter();
  const [events, setEvents] = useState<LiquorEvent[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadData = useCallback(() => {
    try {
      const list = EventService.getEvents();
      setEvents(list);
    } catch (e) {
      console.error('Error cargando eventos:', e);
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

  const getStatusBadge = (status: string) => {
    if (status === 'EN_CURSO') {
      return { text: 'EN CURSO', bg: Theme.colors.success, color: '#FFFFFF' };
    }
    if (status === 'PREPARADO') {
      return { text: 'PREPARADO', bg: Theme.colors.secondary, color: '#FFFFFF' };
    }
    return { text: 'FINALIZADO', bg: '#757575', color: '#FFFFFF' };
  };

  return (
    <View style={styles.container}>
      <View style={styles.topBtnWrapper}>
        <BigButton
          label="+ Crear Nuevo Evento / Feria"
          sublabel="Registrar qué stock vas a llevar"
          icon="calendar-plus"
          variant="secondary"
          onPress={() => router.push('/evento/crear')}
        />
      </View>

      <FlatList
        data={events}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="calendar-blank-outline" size={54} color={Theme.colors.borderBold} />
            <Text style={styles.emptyTitle}>No hay eventos creados</Text>
            <Text style={styles.emptySubtitle}>
              Creá un evento para ferias, fiestas o ferias de fin de semana para controlar el stock que llevás.
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const badge = getStatusBadge(item.status);
          return (
            <Pressable
              onPress={() => router.push(`/evento/${item.id}` as any)}
              accessibilityRole="button"
            >
              <Card style={styles.eventCard}>
                <View style={styles.eventHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.eventName}>{item.name}</Text>
                    <Text style={styles.eventDate}>Fecha: {formatDateOnly(item.date)}</Text>
                  </View>
                  <View style={[styles.badge, { backgroundColor: badge.bg }]}>
                    <Text style={[styles.badgeText, { color: badge.color }]}>{badge.text}</Text>
                  </View>
                </View>

                {/* Métricas rápidas */}
                <View style={styles.metricsRow}>
                  <View style={styles.metricItem}>
                    <Text style={styles.metricLabel}>Llevadas</Text>
                    <Text style={styles.metricVal}>{item.total_taken ?? 0}</Text>
                  </View>
                  <View style={styles.divider} />
                  <View style={styles.metricItem}>
                    <Text style={styles.metricLabel}>Vendidas</Text>
                    <Text style={[styles.metricVal, { color: Theme.colors.success }]}>
                      {item.total_sold ?? 0}
                    </Text>
                  </View>
                  <View style={styles.divider} />
                  <View style={styles.metricItem}>
                    <Text style={styles.metricLabel}>Recaudado</Text>
                    <Text style={[styles.metricVal, { color: Theme.colors.primaryDark }]}>
                      {formatMoney(item.total_revenue ?? 0)}
                    </Text>
                  </View>
                </View>

                <View style={styles.cardFooter}>
                  <Text style={styles.viewDetailText}>Ver detalle y ventas</Text>
                  <MaterialCommunityIcons name="chevron-right" size={24} color={Theme.colors.primary} />
                </View>
              </Card>
            </Pressable>
          );
        }}
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
  eventCard: {
    marginVertical: 6,
    padding: 16,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  eventName: {
    fontSize: Theme.typography.titleMedium,
    fontWeight: 'bold',
    color: Theme.colors.text,
  },
  eventDate: {
    fontSize: Theme.typography.bodyMedium,
    color: Theme.colors.textMuted,
    marginTop: 2,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  metricsRow: {
    flexDirection: 'row',
    backgroundColor: '#FAFAFA',
    borderRadius: Theme.sizes.borderRadius,
    paddingVertical: 10,
    alignItems: 'center',
    marginVertical: 6,
    borderWidth: 1,
    borderColor: '#00000010',
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 13,
    color: Theme.colors.textMuted,
  },
  metricVal: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Theme.colors.text,
    marginTop: 2,
  },
  divider: {
    width: 1,
    height: 28,
    backgroundColor: '#00000015',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 8,
  },
  viewDetailText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: Theme.colors.primary,
    marginRight: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: Theme.typography.titleMedium,
    fontWeight: 'bold',
    color: Theme.colors.text,
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: Theme.typography.bodyMedium,
    color: Theme.colors.textMuted,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 22,
  },
});
