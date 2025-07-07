import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { DataProvider } from '../contexts/DataContext';

export default function TabLayout() {
  return (
    <DataProvider>
      <Tabs
        initialRouteName="index"
        screenOptions={{
          tabBarActiveTintColor: '#2563eb',
          tabBarInactiveTintColor: '#999',
          tabBarStyle: {
            position: 'absolute',
            bottom: 40,
            marginHorizontal: 20,
            backgroundColor: '#fff',
            borderRadius: 25,
            height: 70,
            paddingBottom: 10,
            paddingTop: 10,
            shadowColor: '#000',
            shadowOffset: {
              width: 0,
              height: 10,
            },
            shadowOpacity: 0.25,
            shadowRadius: 15,
            elevation: 10,
            borderTopWidth: 0,
          },
          headerShown: false,
        }}
      >
        <Tabs.Screen
          name="upload"
          options={{
            title: 'Upload',
            tabBarIcon: ({ focused, size }) => (
              <Ionicons 
                name="cloud-upload-outline" 
                size={size} 
                color={focused ? '#2563eb' : '#999'} 
              />
            ),
          }}
        />
        <Tabs.Screen
          name="index"
          options={{
            title: 'Scan',
            tabBarIcon: ({ focused, size }) => (
              <Ionicons 
                name="qr-code-outline" 
                size={size} 
                color={focused ? '#2563eb' : '#999'} 
              />
            ),
          }}
        />
      </Tabs>
    </DataProvider>
  );
} 