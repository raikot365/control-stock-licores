// src/app/_layout.tsx
import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { PaperProvider } from 'react-native-paper';
import { getDB } from '@/db/database';
import { Theme } from '@/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  useEffect(() => {
    try {
      // Inicializar base de datos y esquema
      getDB();
    } catch (e) {
      console.error('Error inicializando base de datos:', e);
    } finally {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, []);

  return (
    <PaperProvider>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: '#FFFFFF',
          },
          headerTintColor: Theme.colors.primary,
          headerTitleStyle: {
            fontSize: Theme.typography.titleMedium,
            fontWeight: 'bold',
          },
          headerTitleAlign: 'center',
          contentStyle: {
            backgroundColor: Theme.colors.background,
          },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="precios" options={{ title: 'Precios de Botellas' }} />
        <Stack.Screen name="combos" options={{ title: 'Combos y Promociones' }} />
        <Stack.Screen name="estadisticas" options={{ title: 'Estadísticas y Reportes' }} />
        <Stack.Screen name="ventas" options={{ title: 'Historial de Ventas' }} />
        <Stack.Screen name="evento/[id]" options={{ title: 'Detalle del Evento' }} />
        <Stack.Screen name="evento/crear" options={{ title: 'Crear Nuevo Evento' }} />
        <Stack.Screen name="respaldo" options={{ title: 'Copia de Seguridad' }} />
      </Stack>
    </PaperProvider>
  );
}
