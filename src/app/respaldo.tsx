// src/app/respaldo.tsx
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BigButton } from '@/components/BigButton';
import { Card } from '@/components/Card';
import { ConfirmModal } from '@/components/ConfirmModal';
import { BackupService } from '@/services/backupService';
import { Theme } from '@/theme';

export default function RespaldoScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [restoreModalVisible, setRestoreModalVisible] = useState(false);

  const handleExportBackup = async () => {
    try {
      setLoading(true);
      await BackupService.exportBackup();
    } catch (e: any) {
      alert(e.message || 'Error al exportar copia de seguridad');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmRestore = async () => {
    setRestoreModalVisible(false);
    try {
      setLoading(true);
      const restored = await BackupService.restoreBackup();
      if (restored) {
        alert('¡Copia de seguridad restaurada con éxito! Reiniciá la app para refrescar los datos.');
        router.replace('/(tabs)');
      }
    } catch (e: any) {
      alert(e.message || 'Error al restaurar respaldo');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Card variant="highlight" style={styles.card}>
        <View style={styles.iconCenter}>
          <MaterialCommunityIcons name="shield-check" size={54} color={Theme.colors.primary} />
        </View>
        <Text style={styles.title}>Copia de Seguridad de Tus Datos</Text>
        <Text style={styles.description}>
          Todos los datos de tu stock, precios y ventas se guardan en este teléfono. Para no perder nada si cambiás o se rompe tu celular, hacé una copia periódica y compartítela a tu propio WhatsApp o Google Drive.
        </Text>
      </Card>

      <Card style={styles.card}>
        <Text style={styles.actionTitle}>1. Crear y Compartir Copia</Text>
        <Text style={styles.actionDescription}>
          Genera un archivo seguro con todo tu inventario y ventas históricas para enviarlo a tu WhatsApp.
        </Text>

        <BigButton
          label="Crear y Compartir Respaldo"
          sublabel="Se abre WhatsApp para guardarlo"
          icon="share-variant"
          variant="primary"
          loading={loading}
          onPress={handleExportBackup}
          style={styles.actionBtn}
        />
      </Card>

      <Card style={styles.card}>
        <Text style={styles.actionTitle}>2. Restaurar Copia Anterior</Text>
        <Text style={styles.actionDescription}>
          Si compraste un celular nuevo o necesitás recuperar tus datos, elegí el archivo de respaldo que guardaste previamente.
        </Text>

        <BigButton
          label="Restaurar desde Archivo"
          sublabel="Reemplaza los datos actuales con la copia"
          icon="cloud-download"
          variant="outline"
          loading={loading}
          onPress={() => setRestoreModalVisible(true)}
          style={styles.actionBtn}
        />
      </Card>

      <ConfirmModal
        visible={restoreModalVisible}
        title="¿Restaurar copia de seguridad?"
        message="Atención: Esta acción reemplazará la base de datos actual con los datos del archivo que elijas."
        confirmLabel="Sí, elegir archivo y restaurar"
        cancelLabel="Cancelar"
        isDestructive={true}
        onConfirm={handleConfirmRestore}
        onCancel={() => setRestoreModalVisible(false)}
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
    paddingBottom: 40,
  },
  card: {
    padding: 18,
    marginBottom: 16,
  },
  iconCenter: {
    alignItems: 'center',
    marginBottom: 10,
  },
  title: {
    fontSize: Theme.typography.titleMedium,
    fontWeight: 'bold',
    color: Theme.colors.text,
    textAlign: 'center',
    marginBottom: 6,
  },
  description: {
    fontSize: Theme.typography.bodyMedium,
    color: Theme.colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
  },
  actionTitle: {
    fontSize: Theme.typography.titleMedium,
    fontWeight: 'bold',
    color: Theme.colors.text,
  },
  actionDescription: {
    fontSize: Theme.typography.bodyMedium,
    color: Theme.colors.textMuted,
    marginTop: 4,
    marginBottom: 14,
    lineHeight: 22,
  },
  actionBtn: {
    marginTop: 4,
  },
});
