// src/app/(tabs)/_layout.tsx
import React from 'react';
import { Tabs } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Theme } from '@/theme';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: {
          backgroundColor: '#FFFFFF',
          elevation: 2,
          shadowOpacity: 0.1,
        },
        headerTitleStyle: {
          fontSize: Theme.typography.titleLarge,
          fontWeight: 'bold',
          color: Theme.colors.primary,
        },
        headerTitleAlign: 'center',
        tabBarStyle: {
          height: 72,
          paddingBottom: 10,
          paddingTop: 8,
          backgroundColor: '#FFFFFF',
          borderTopWidth: 2,
          borderTopColor: Theme.colors.border,
        },
        tabBarActiveTintColor: Theme.colors.primary,
        tabBarInactiveTintColor: '#616161',
        tabBarLabelStyle: {
          fontSize: 14,
          fontWeight: 'bold',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Inicio',
          headerTitle: 'Control de Licores',
          tabBarIcon: ({ color }) => (
            <MaterialCommunityIcons name="home-outline" size={30} color={color as string} />
          ),
        }}
      />
      <Tabs.Screen
        name="stock"
        options={{
          title: 'Stock',
          headerTitle: 'Inventario de Stock',
          tabBarIcon: ({ color }) => (
            <MaterialCommunityIcons name="bottle-wine-outline" size={30} color={color as string} />
          ),
        }}
      />
      <Tabs.Screen
        name="vender"
        options={{
          title: 'Vender',
          headerTitle: 'Nueva Venta',
          tabBarIcon: ({ color }) => (
            <MaterialCommunityIcons name="cash-register" size={30} color={color as string} />
          ),
        }}
      />
      <Tabs.Screen
        name="eventos"
        options={{
          title: 'Eventos',
          headerTitle: 'Ferias y Eventos',
          tabBarIcon: ({ color }) => (
            <MaterialCommunityIcons name="calendar-star" size={30} color={color as string} />
          ),
        }}
      />
      <Tabs.Screen
        name="mas"
        options={{
          title: 'Más',
          headerTitle: 'Más Opciones',
          tabBarIcon: ({ color }) => (
            <MaterialCommunityIcons name="dots-horizontal-circle-outline" size={30} color={color as string} />
          ),
        }}
      />
    </Tabs>
  );
}
