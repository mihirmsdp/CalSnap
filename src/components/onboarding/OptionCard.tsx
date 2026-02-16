import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

interface OptionCardProps {
  label: string;
  description?: string;
  icon?: string;
  selected: boolean;
  onPress: () => void;
  multi?: boolean;
}

export const OptionCard = ({
  label,
  description,
  icon,
  selected,
  onPress,
  multi
}: OptionCardProps): React.JSX.Element => (
  <Pressable style={[styles.card, selected && styles.cardSelected]} onPress={onPress}>
    <View style={styles.left}>
      {icon ? <Text style={styles.icon}>{icon}</Text> : null}
      <View style={styles.textWrap}>
        <Text style={styles.label}>{label}</Text>
        {description ? <Text style={styles.description}>{description}</Text> : null}
      </View>
    </View>
    <Text style={styles.mark}>{selected ? (multi ? "☑" : "◉") : multi ? "☐" : "○"}</Text>
  </Pressable>
);

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: "#e5e9eb",
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12
  },
  cardSelected: {
    borderColor: "#55dc66",
    backgroundColor: "#effdf0"
  },
  left: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 10
  },
  icon: {
    fontSize: 20
  },
  textWrap: {
    flex: 1
  },
  label: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1f2629"
  },
  description: {
    marginTop: 3,
    fontSize: 12,
    color: "#667176"
  },
  mark: {
    fontSize: 18,
    color: "#2d9f3f",
    fontWeight: "700"
  }
});
