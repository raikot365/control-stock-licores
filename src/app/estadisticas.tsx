// src/app/estadisticas.tsx
import React, { useCallback, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BigButton } from '@/components/BigButton';
import { Card } from '@/components/Card';
import { ExportService } from '@/services/exportService';
import { GeneralStats, StatPeriod, StatsService } from '@/services/statsService';
import { Theme } from '@/theme';
import { formatBottlesCount, formatMoney } from '@/utils/format';

export default function EstadisticasScreen() {
  const [period, setPeriod] = useState<StatPeriod>('all');
  const [stats, setStats] = useState<GeneralStats>({
    totalRevenue: 0,
    totalBottlesSold: 0,
    totalGrandeSold: 0,
    totalChicaSold: 0,
    particularRevenue: 0,
    particularBottles: 0,
    eventsRevenue: 0,
    eventsBottles: 0,
    byFlavor: [],
    topCombos: [],
  });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);

  const loadData = useCallback(() => {
    try {
      const data = StatsService.getStats(period);
      setStats(data);
    } catch (e) {
      console.error(e);
    }
  }, [period]);

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

  const handleExportXLSX = async () => {
    try {
      setExportLoading(true);
      const uri = await ExportService.exportGeneralXLSX();
      await ExportService.shareFile(uri, 'Compartir estadísticas generales en Excel');
    } catch (e: any) {
      alert(e.message || 'Error al exportar Excel');
    } finally {
      setExportLoading(false);
    }
  };

  const handleExportCSV = async () => {
    try {
      setExportLoading(true);
      const uri = await ExportService.exportGeneralCSV();
      await ExportService.shareFile(uri, 'Compartir estadísticas generales en CSV');
    } catch (e: any) {
      alert(e.message || 'Error al exportar CSV');
    } finally {
      setExportLoading(false);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />}
    >
      {/* Selector de Período */}
      <View style={styles.periodRow}>
        {(['all', 'month', 'week', 'today'] as StatPeriod[]).map((p) => {
          const labels: Record<StatPeriod, string> = {
            all: 'Histórico',
            month: 'Este Mes',
            week: '7 Días',
            today: 'Hoy',
          };
          return (
            <Pressable
              key={p}
              style={[styles.periodTab, period === p && styles.periodTabSelected]}
              onPress={() => setPeriod(p)}
            >
              <Text style={[styles.periodTabText, period === p && styles.periodTabTextSelected]}>
                {labels[p]}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Recaudación Total */}
      <Card variant="highlight" style={styles.heroCard}>
        <Text style={styles.heroLabel}>Recaudación Total</Text>
        <Text style={styles.heroAmount}>{formatMoney(stats.totalRevenue)}</Text>
        <Text style={styles.heroBottles}>
          {formatBottlesCount(stats.totalBottlesSold)} vendidas en total
        </Text>

        <View style={styles.sizeBreakdown}>
          <Text style={styles.sizeText}>
            Grandes: <Text style={styles.bold}>{stats.totalGrandeSold}</Text>
          </Text>
          <Text style={styles.sizeDivider}>•</Text>
          <Text style={styles.sizeText}>
            Chicas: <Text style={styles.bold}>{stats.totalChicaSold}</Text>
          </Text>
        </View>
      </Card>

      {/* Particular vs Eventos */}
      <Card style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Comparación de Ventas</Text>

        <View style={styles.compareRow}>
          <View style={styles.compareBox}>
            <MaterialCommunityIcons name="home-outline" size={26} color={Theme.colors.primary} />
            <Text style={styles.compareTitle}>Particulares</Text>
            <Text style={styles.compareVal}>{formatMoney(stats.particularRevenue)}</Text>
            <Text style={styles.compareSub}>{stats.particularBottles} botellas</Text>
          </View>

          <View style={styles.verticalDivider} />

          <View style={styles.compareBox}>
            <MaterialCommunityIcons name="calendar-star" size={26} color={Theme.colors.secondary} />
            <Text style={styles.compareTitle}>En Eventos</Text>
            <Text style={styles.compareVal}>{formatMoney(stats.eventsRevenue)}</Text>
            <Text style={styles.compareSub}>{stats.eventsBottles} botellas</Text>
          </View>
        </View>
      </Card>

      {/* Exportar a Excel y CSV */}
      <Card style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Exportar y Enviar por WhatsApp</Text>
        <Text style={styles.sectionSubtitle}>
          Generá el archivo completo con 4 hojas (Resumen, Sabores, Detalle de ventas y Stock actual)
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

      {/* Ranking por Sabor */}
      <Card style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Ventas por Sabor</Text>
        {stats.byFlavor.length === 0 ? (
          <Text style={styles.emptyText}>No hay ventas registradas en este período.</Text>
        ) : (
          stats.byFlavor.map((item, idx) => (
            <View key={item.flavorId} style={styles.flavorRow}>
              <View style={styles.rankBadge}>
                <Text style={styles.rankNum}>#{idx + 1}</Text>
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.flavorRowTitle}>{item.flavorName}</Text>
                <Text style={styles.flavorRowDetails}>
                  {item.totalQty} botellas ({item.grandeQty} grandes, {item.chicaQty} chicas)
                </Text>
              </View>

              <Text style={styles.flavorRowRevenue}>{formatMoney(item.totalRevenue)}</Text>
            </View>
          ))
        )}
      </Card>

      {/* Combos Más Vendidos */}
      {stats.topCombos.length > 0 && (
        <Card style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Combos Más Vendidos</Text>
          {stats.topCombos.map((combo, idx) => (
            <View key={idx} style={styles.comboStatRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.comboStatName}>{combo.comboName}</Text>
                <Text style={styles.comboStatCount}>{combo.count} veces vendido</Text>
              </View>
              <Text style={styles.comboStatRevenue}>{formatMoney(combo.totalRevenue)}</Text>
            </View>
          ))}
        </Card>
      )}
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
  periodRow: {
    flexDirection: 'row',
    marginBottom: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: Theme.sizes.borderRadius,
    padding: 4,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  periodTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  periodTabSelected: {
    backgroundColor: Theme.colors.primary,
  },
  periodTabText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Theme.colors.textMuted,
  },
  periodTabTextSelected: {
    color: '#FFFFFF',
  },
  heroCard: {
    alignItems: 'center',
    paddingVertical: 20,
    marginBottom: 14,
  },
  heroLabel: {
    fontSize: Theme.typography.bodyLarge,
    color: Theme.colors.textMuted,
    fontWeight: '600',
  },
  heroAmount: {
    fontSize: 48,
    fontWeight: '900',
    color: Theme.colors.primaryDark,
    marginVertical: 4,
  },
  heroBottles: {
    fontSize: Theme.typography.bodyLarge,
    color: Theme.colors.text,
    fontWeight: 'bold',
  },
  sizeBreakdown: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  sizeText: {
    fontSize: Theme.typography.bodyMedium,
    color: Theme.colors.textMuted,
  },
  sizeDivider: {
    marginHorizontal: 8,
    color: Theme.colors.textMuted,
  },
  bold: {
    fontWeight: 'bold',
    color: Theme.colors.text,
  },
  sectionCard: {
    marginBottom: 14,
    padding: 16,
  },
  sectionTitle: {
    fontSize: Theme.typography.titleMedium,
    fontWeight: 'bold',
    color: Theme.colors.text,
  },
  sectionSubtitle: {
    fontSize: Theme.typography.bodyMedium,
    color: Theme.colors.textMuted,
    marginTop: 2,
    marginBottom: 12,
    lineHeight: 22,
  },
  compareRow: {
    flexDirection: 'row',
    backgroundColor: '#FAFAFA',
    borderRadius: Theme.sizes.borderRadius,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#00000010',
    marginTop: 8,
  },
  compareBox: {
    flex: 1,
    alignItems: 'center',
  },
  compareTitle: {
    fontSize: Theme.typography.bodyMedium,
    fontWeight: 'bold',
    color: Theme.colors.textMuted,
    marginTop: 4,
  },
  compareVal: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Theme.colors.text,
    marginVertical: 2,
  },
  compareSub: {
    fontSize: 13,
    color: Theme.colors.textMuted,
  },
  verticalDivider: {
    width: 1,
    height: '80%',
    backgroundColor: '#00000015',
  },
  exportBtn: {
    marginVertical: 6,
  },
  emptyText: {
    fontSize: Theme.typography.bodyMedium,
    color: Theme.colors.textMuted,
    marginTop: 8,
  },
  flavorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#00000010',
  },
  rankBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Theme.colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  rankNum: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Theme.colors.primaryDark,
  },
  flavorRowTitle: {
    fontSize: Theme.typography.bodyLarge,
    fontWeight: 'bold',
    color: Theme.colors.text,
  },
  flavorRowDetails: {
    fontSize: 13,
    color: Theme.colors.textMuted,
    marginTop: 2,
  },
  flavorRowRevenue: {
    fontSize: Theme.typography.bodyLarge,
    fontWeight: 'bold',
    color: Theme.colors.primaryDark,
  },
  comboStatRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#00000010',
  },
  comboStatName: {
    fontSize: Theme.typography.bodyLarge,
    fontWeight: 'bold',
    color: Theme.colors.text,
  },
  comboStatCount: {
    fontSize: 13,
    color: Theme.colors.textMuted,
    marginTop: 2,
  },
  comboStatRevenue: {
    fontSize: Theme.typography.bodyLarge,
    fontWeight: 'bold',
    color: Theme.colors.primaryDark,
  },
});
