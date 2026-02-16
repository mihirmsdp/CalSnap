import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { MainTabParamList } from "@/types/navigation";
import { HomeScreen } from "@/screens/main/HomeScreen";
import { HistoryScreen } from "@/screens/main/HistoryScreen";
import { ProfileScreen } from "@/screens/main/ProfileScreen";
import { ChatScreen } from "@/screens/main/ChatScreen";
import { ScanPlaceholderScreen } from "@/screens/main/ScanPlaceholderScreen";
import { ScanActionModal } from "@/components/logging/ScanActionModal";

const Tab = createBottomTabNavigator<MainTabParamList>();

export const MainTabNavigator = (): React.JSX.Element => {
  const [scanModalVisible, setScanModalVisible] = React.useState(false);

  return (
    <>
      <Tab.Navigator
        screenOptions={({ route }) => ({
      headerShown: false,
      tabBarActiveTintColor: "#111111",
      tabBarInactiveTintColor: "#888f96",
      tabBarShowLabel: true,
      tabBarLabelStyle: {
        fontSize: 11,
        fontWeight: "700",
        marginBottom: 4
      },
      tabBarStyle: {
        borderTopWidth: 0,
        elevation: 0,
        height: 78,
        paddingTop: 8,
        paddingBottom: 8,
        backgroundColor: "#ffffff",
        borderTopLeftRadius: 18,
        borderTopRightRadius: 18
      },
      tabBarIcon: ({ color, focused }) => {
        const iconMap: Record<keyof MainTabParamList, keyof typeof Ionicons.glyphMap> = {
          Home: focused ? "home" : "home-outline",
          Progress: focused ? "bar-chart" : "bar-chart-outline",
          Scan: "scan-circle",
          Chat: focused ? "chatbubble" : "chatbubble-outline",
          Profile: focused ? "person" : "person-outline"
        };

        if (route.name === "Scan") {
          return (
            <View style={styles.scanIconWrap}>
              <Ionicons name="scan" size={24} color="#0f1b10" />
            </View>
          );
        }
        return <Ionicons name={iconMap[route.name]} size={20} color={color} />;
      }
    })}
      >
        <Tab.Screen name="Home" component={HomeScreen} />
        <Tab.Screen
          name="Progress"
          component={HistoryScreen}
          options={{
            title: "Progress"
          }}
        />
        <Tab.Screen
          name="Scan"
          component={ScanPlaceholderScreen}
          options={{
            title: "Scan",
            tabBarLabel: ({ focused }) => (
              <Text style={[styles.scanLabel, focused && styles.scanLabelFocused]}>Scan</Text>
            )
          }}
          listeners={{
            tabPress: (event) => {
              event.preventDefault();
              setScanModalVisible(true);
            }
          }}
        />
        <Tab.Screen name="Chat" component={ChatScreen} />
        <Tab.Screen name="Profile" component={ProfileScreen} />
      </Tab.Navigator>

      <ScanActionModal visible={scanModalVisible} onClose={() => setScanModalVisible(false)} />
    </>
  );
};

const styles = StyleSheet.create({
  scanIconWrap: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "#8ee83f",
    alignItems: "center",
    justifyContent: "center",
    marginTop: -22,
    borderWidth: 5,
    borderColor: "#f4f7ee"
  },
  scanLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#8a9096",
    marginBottom: 2
  },
  scanLabelFocused: {
    color: "#111111"
  }
});
