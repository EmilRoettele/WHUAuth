import { Tabs } from 'expo-router';
import { Image } from 'react-native';

export default function TabLayout() {
  return (
    <Tabs
      initialRouteName="index"
      screenOptions={{
        tabBarActiveTintColor: '#007AFF',
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
            <Image
              source={require('../assets/img/upload.jpg')}
              style={{
                width: size,
                height: size,
                opacity: focused ? 1 : 0.6,
                borderRadius: 8,
              }}
              resizeMode="cover"
            />
          ),
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          title: 'Scan',
          tabBarIcon: ({ focused, size }) => (
            <Image
              source={require('../assets/img/scan.png')}
              style={{
                width: size,
                height: size,
                opacity: focused ? 1 : 0.6,
                borderRadius: 8,
              }}
              resizeMode="contain"
            />
          ),
        }}
      />
    </Tabs>
  );
} 