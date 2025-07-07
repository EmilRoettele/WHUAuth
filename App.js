import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { DataProvider } from './contexts/DataContext';

// Import your screens
import ScanScreen from './app/index';
import UploadScreen from './app/upload';

const Tab = createBottomTabNavigator();

export default function App() {
  return (
    <DataProvider>
      <NavigationContainer>
        <Tab.Navigator
          initialRouteName="Scan"
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
          <Tab.Screen
            name="Upload"
            component={UploadScreen}
            options={{
              tabBarIcon: ({ focused, size }) => (
                <Ionicons 
                  name="cloud-upload-outline" 
                  size={size} 
                  color={focused ? '#2563eb' : '#999'} 
                />
              ),
            }}
          />
          <Tab.Screen
            name="Scan"
            component={ScanScreen}
            options={{
              tabBarIcon: ({ focused, size }) => (
                <Ionicons 
                  name="qr-code-outline" 
                  size={size} 
                  color={focused ? '#2563eb' : '#999'} 
                />
              ),
            }}
          />
        </Tab.Navigator>
      </NavigationContainer>
    </DataProvider>
  );
} 