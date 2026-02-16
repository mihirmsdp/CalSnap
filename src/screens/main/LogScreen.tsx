import React, { useState } from "react";
import { ActivityIndicator, Alert, Image, StyleSheet, Text, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Screen } from "@/components/common/Screen";
import { colors } from "@/constants/theme";
import { PrimaryButton } from "@/components/common/PrimaryButton";
import { apiService } from "@/services/api";
import { MainStackParamList } from "@/types/navigation";

export const LogScreen = (): React.JSX.Element => {
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const requestLibraryImage = async (): Promise<string | null> => {
    setError(null);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError("Could not access gallery. Please grant media permissions.");
      return null;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      quality: 0.8
    });
    if (result.canceled || !result.assets[0]) {
      return null;
    }
    return result.assets[0].uri;
  };

  const requestCameraImage = async (): Promise<string | null> => {
    setError(null);
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      setError("Could not access camera. Please grant camera permissions.");
      return null;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.8
    });
    if (result.canceled || !result.assets[0]) {
      return null;
    }
    return result.assets[0].uri;
  };

  const analyzeAndNavigate = async (selectedUri: string): Promise<void> => {
    setError(null);
    setImageUri(selectedUri);
    setIsAnalyzing(true);
    try {
      const analysis = await apiService.analyzeFoodImageFromUri(selectedUri);
      if (!analysis.foods || analysis.foods.length === 0) {
        throw new Error("No food detected in image. Please try a clearer photo.");
      }
      navigation.navigate("EditFoodLog", {
        mode: "new",
        imageUri: selectedUri,
        aiResults: analysis
      });
    } catch (err) {
      const message = (err as Error).message || "Failed to analyze image. Please try again.";
      setError(message);
      Alert.alert("Analysis Failed", message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const onLogFood = (): void => {
    Alert.alert("Log Food", "Choose a photo source", [
      {
        text: "Take Photo",
        onPress: () => {
          void requestCameraImage().then((uri) => {
            if (uri) void analyzeAndNavigate(uri);
          });
        }
      },
      {
        text: "Select from Gallery",
        onPress: () => {
          void requestLibraryImage().then((uri) => {
            if (uri) void analyzeAndNavigate(uri);
          });
        }
      },
      { text: "Cancel", style: "cancel" }
    ]);
  };

  return (
    <Screen>
      <Text style={styles.title}>Log Food</Text>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Photo Logging</Text>
        <Text style={styles.muted}>Take a photo or pick one from your gallery to analyze with AI.</Text>
        <PrimaryButton label="Log Food" onPress={onLogFood} />
        {isAnalyzing ? (
          <View style={styles.analyzing}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.muted}>Analyzing food...</Text>
          </View>
        ) : null}
        {imageUri ? <Image source={{ uri: imageUri }} style={styles.preview} /> : null}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </Screen>
  );
};

const styles = StyleSheet.create({
  title: {
    fontSize: 30,
    fontWeight: "800",
    color: colors.text
  },
  section: {
    gap: 10,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface
  },
  sectionTitle: {
    fontWeight: "700",
    color: colors.text,
    fontSize: 18
  },
  preview: {
    width: "100%",
    height: 180,
    borderRadius: 12
  },
  analyzing: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  muted: {
    color: colors.mutedText
  },
  error: {
    color: colors.danger,
    fontWeight: "600"
  }
});
