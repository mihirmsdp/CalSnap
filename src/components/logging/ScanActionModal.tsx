import React from "react";
import { ActivityIndicator, Alert, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { apiService } from "@/services/api";
import { MainStackParamList } from "@/types/navigation";
import { MealType } from "@/types/models";

interface ScanActionModalProps {
  visible: boolean;
  onClose: () => void;
  preselectedMealType?: MealType;
}

export const ScanActionModal = ({
  visible,
  onClose,
  preselectedMealType
}: ScanActionModalProps): React.JSX.Element => {
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const [scanBusy, setScanBusy] = React.useState(false);

  const handleAnalyze = async (mode: "camera" | "gallery"): Promise<void> => {
    setScanBusy(true);
    try {
      const permission =
        mode === "camera"
          ? await ImagePicker.requestCameraPermissionsAsync()
          : await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          "Permission Required",
          mode === "camera"
            ? "Could not access camera. Please grant camera permissions."
            : "Could not access gallery. Please grant media permissions."
        );
        return;
      }

      const result =
        mode === "camera"
          ? await ImagePicker.launchCameraAsync({ allowsEditing: true, quality: 0.8 })
          : await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ["images"],
              allowsEditing: true,
              quality: 0.8
            });

      if (result.canceled || !result.assets[0]) {
        return;
      }

      const imageUri = result.assets[0].uri;
      const aiResults = await apiService.analyzeFoodImageFromUri(
        imageUri,
        result.assets[0].mimeType || "image/jpeg"
      );
      if (!aiResults.foods?.length) {
        Alert.alert("No Food Detected", "No food detected in image. Please try a clearer photo.");
        return;
      }
      onClose();
      navigation.navigate("EditFoodLog", { mode: "new", imageUri, aiResults, preselectedMealType });
    } catch (error) {
      Alert.alert(
        "Analysis Failed",
        (error as Error).message || "Failed to analyze image. Please check your connection and try again."
      );
    } finally {
      setScanBusy(false);
    }
  };

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>Scan Food</Text>
          <Text style={styles.modalSubtitle}>
            {preselectedMealType
              ? `Log directly to ${preselectedMealType}.`
              : "Choose how you want to add your meal."}
          </Text>

          <Pressable style={styles.actionButton} onPress={() => void handleAnalyze("camera")} disabled={scanBusy}>
            <View style={[styles.iconBubble, { backgroundColor: "#e8fbec" }]}>
              <Ionicons name="camera" size={20} color="#25a83a" />
            </View>
            <Text style={styles.actionText}>Take Photo</Text>
          </Pressable>

          <Pressable style={styles.actionButton} onPress={() => void handleAnalyze("gallery")} disabled={scanBusy}>
            <View style={[styles.iconBubble, { backgroundColor: "#eaf4ff" }]}>
              <Ionicons name="images" size={20} color="#0d6efd" />
            </View>
            <Text style={styles.actionText}>Select Image</Text>
          </Pressable>

          <Pressable style={styles.cancelButton} onPress={onClose} disabled={scanBusy}>
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>

          {scanBusy ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator color="#29b243" />
              <Text style={styles.loadingText}>Analyzing food...</Text>
            </View>
          ) : null}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(11,16,18,0.45)",
    justifyContent: "center",
    padding: 22
  },
  modalCard: {
    borderRadius: 20,
    backgroundColor: "#ffffff",
    padding: 16,
    gap: 12
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "900",
    color: "#172126"
  },
  modalSubtitle: {
    color: "#637176",
    fontWeight: "600"
  },
  actionButton: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e7ecef",
    backgroundColor: "#f9fbfb",
    paddingVertical: 12,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10
  },
  iconBubble: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center"
  },
  actionText: {
    fontWeight: "800",
    color: "#1a252a",
    fontSize: 16
  },
  cancelButton: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12
  },
  cancelText: {
    color: "#e24d4d",
    fontWeight: "800",
    fontSize: 16
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  loadingText: {
    color: "#526064",
    fontWeight: "700"
  }
});
