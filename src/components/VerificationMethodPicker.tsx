import React from "react";
import { Pressable, ScrollView, StyleSheet, Text } from "react-native";

import { colors, radii, spacing } from "@/theme/colors";
import type { VerificationMethod } from "@/types";

const OPTIONS: { value: VerificationMethod; label: string }[] = [
  { value: "healthkit", label: "Apple Health" },
  { value: "health_connect", label: "Health Connect" },
  { value: "photo", label: "Photo" },
  { value: "ai_image", label: "AI photo review" },
  { value: "gps", label: "Location" },
  { value: "timer", label: "Timer" },
  { value: "step_count", label: "Step count" },
  { value: "workout", label: "Workout" },
];

interface Props {
  value: VerificationMethod | null;
  onChange: (method: VerificationMethod) => void;
}

export function VerificationMethodPicker({ value, onChange }: Props) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.row}
    >
      {OPTIONS.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            style={[styles.chip, selected && styles.chipSelected]}
          >
            <Text
              style={[styles.chipText, selected && styles.chipTextSelected]}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    flexGrow: 0,
  },
  chip: {
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginRight: spacing.sm,
  },
  chipSelected: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  chipText: {
    color: colors.textSecondary,
    fontWeight: "600",
  },
  chipTextSelected: {
    color: "#0B0B0F",
  },
});
