import React from "react";
import { Alert, Animated, Image, Modal, Pressable, StyleSheet, Text, View } from "react-native";
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

const LoadingBars = (): React.JSX.Element => {
  const bars = React.useRef(Array.from({ length: 5 }, () => new Animated.Value(0.25))).current;

  React.useEffect(() => {
    const loops = bars.map((value, index) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(index * 110),
          Animated.timing(value, {
            toValue: 1,
            duration: 360,
            useNativeDriver: false
          }),
          Animated.timing(value, {
            toValue: 0.25,
            duration: 360,
            useNativeDriver: false
          })
        ])
      )
    );

    loops.forEach((animation) => animation.start());
    return () => {
      loops.forEach((animation) => animation.stop());
    };
  }, [bars]);

  return (
    <View style={styles.barsRow}>
      {bars.map((value, index) => (
        <Animated.View
          key={`scan_bar_${index}`}
          style={[
            styles.bar,
            {
              height: value.interpolate({
                inputRange: [0.25, 1],
                outputRange: [12, 44]
              })
            }
          ]}
        />
      ))}
    </View>
  );
};

export const ScanActionModal = ({
  visible,
  onClose,
  preselectedMealType
}: ScanActionModalProps): React.JSX.Element => {
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const [scanBusy, setScanBusy] = React.useState(false);
  const [analyzingUri, setAnalyzingUri] = React.useState<string | null>(null);
  const scanSweep = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (!scanBusy || !analyzingUri) {
      scanSweep.stopAnimation();
      scanSweep.setValue(0);
      return;
    }

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scanSweep, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true
        }),
        Animated.timing(scanSweep, {
          toValue: 0,
          duration: 1200,
          useNativeDriver: true
        })
      ])
    );
    loop.start();

    return () => {
      loop.stop();
      scanSweep.stopAnimation();
      scanSweep.setValue(0);
    };
  }, [analyzingUri, scanBusy, scanSweep]);

  const handleAnalyze = async (mode: "camera" | "gallery"): Promise<void> => {
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
      setAnalyzingUri(imageUri);
      setScanBusy(true);
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
      setAnalyzingUri(null);
    }
  };

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={[styles.modalCard, scanBusy && styles.modalCardBusy]}>
          {scanBusy && analyzingUri ? (
            <View style={styles.analyzingWrap}>
              <Text style={styles.modalTitle}>Analyzing...</Text>
              <Text style={styles.modalSubtitle}>AI is extracting nutrition details from your photo</Text>
              <View style={styles.previewFrame}>
                <Image source={{ uri: analyzingUri }} style={styles.previewImage} />
                <Animated.View
                  style={[
                    styles.scanLine,
                    {
                      transform: [
                        {
                          translateY: scanSweep.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0, 224]
                          })
                        }
                      ],
                      opacity: scanSweep.interpolate({
                        inputRange: [0, 0.5, 1],
                        outputRange: [0.45, 0.95, 0.45]
                      })
                    }
                  ]}
                />
              </View>
              <LoadingBars />
              <Text style={styles.loadingText}>Processing food items and nutrition values</Text>
            </View>
          ) : (
            <>
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

              <Pressable
                style={styles.actionButton}
                onPress={() => {
                  onClose();
                  navigation.navigate("FoodSearch", { mealType: preselectedMealType || "snack" });
                }}
                disabled={scanBusy}
              >
                <View style={[styles.iconBubble, { backgroundColor: "#f0fdf4" }]}>
                  <Ionicons name="search" size={20} color="#10b981" />
                </View>
                <Text style={styles.actionText}>Manual Search (USDA)</Text>
              </Pressable>

              <Pressable style={styles.cancelButton} onPress={onClose} disabled={scanBusy}>
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
            </>
          )}
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
  modalCardBusy: {
    paddingVertical: 18
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
  analyzingWrap: {
    alignItems: "center",
    gap: 10
  },
  previewFrame: {
    width: "100%",
    borderRadius: 18,
    borderWidth: 2,
    borderColor: "#e5ecef",
    overflow: "hidden",
    position: "relative"
  },
  previewImage: {
    width: "100%",
    height: 230
  },
  scanLine: {
    position: "absolute",
    left: 14,
    right: 14,
    top: 0,
    height: 3,
    backgroundColor: "rgba(62,194,92,0.75)",
    borderRadius: 99
  },
  barsRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "center",
    gap: 6,
    height: 46
  },
  bar: {
    width: 6,
    borderRadius: 99,
    backgroundColor: "#32bd52"
  },
  loadingText: {
    color: "#526064",
    fontWeight: "700",
    textAlign: "center"
  }
});
