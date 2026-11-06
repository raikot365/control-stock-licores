// src/services/backupService.ts
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { DB_NAME, getDB } from '@/db/database';

export const BackupService = {
  /**
   * Exporta la base de datos actual para compartirla (por WhatsApp, Drive, etc.)
   */
  async exportBackup(): Promise<string> {
    const dbDir = `${FileSystem.documentDirectory}SQLite/`;
    const dbUri = `${dbDir}${DB_NAME}`;

    const info = await FileSystem.getInfoAsync(dbUri);
    if (!info.exists) {
      // Intentar forzar apertura para que exista
      getDB();
    }

    const today = new Date().toISOString().split('T')[0];
    const targetFileName = `Respaldo_Licores_${today}.db`;
    const targetUri = `${FileSystem.documentDirectory}${targetFileName}`;

    await FileSystem.copyAsync({
      from: dbUri,
      to: targetUri,
    });

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(targetUri, {
        dialogTitle: 'Compartir Copia de Seguridad de Licores',
        mimeType: 'application/octet-stream',
      });
    }

    return targetUri;
  },

  /**
   * Permite al usuario seleccionar un archivo .db para restaurar la información
   */
  async restoreBackup(): Promise<boolean> {
    const result = await DocumentPicker.getDocumentAsync({
      copyToCacheDirectory: true,
      type: '*/*',
    });

    if (result.canceled || !result.assets || result.assets.length === 0) {
      return false;
    }

    const selectedFile = result.assets[0];
    const dbDir = `${FileSystem.documentDirectory}SQLite/`;
    const targetDbUri = `${dbDir}${DB_NAME}`;

    // Asegurar directorio
    const dirInfo = await FileSystem.getInfoAsync(dbDir);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(dbDir, { intermediates: true });
    }

    // Copiar el archivo sobre la base de datos
    await FileSystem.copyAsync({
      from: selectedFile.uri,
      to: targetDbUri,
    });

    return true;
  },
};
