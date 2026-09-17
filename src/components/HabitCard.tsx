import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { StreakBadge } from "./StreakBadge";

import { colors, radii, spacing } from "@/theme/colors";
import type { Habit, Streak } from "@/types";

const VERIFICATION_LABELS: Record<Habit["verificationMethod"], string> = {
  healthkit: "Apple Health",
  health_connect: "Health Connect",
  photo: "Photo proof",
  gps: "Location proof",
  timer: "Timer",
  step_count: "Step count",
  workout: "Workout tracking",
  ai_image: "AI photo review",
  manual_ai_review: "AI review",
};

interface HabitCardProps {
  habit: Habit;
  streak?: Streak | null;
  onPress: () => void;
}

export function HabitCard({ habit, streak, onPress }: HabitCardProps) {
  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.header}>
        <Text style={styles.title}>{habit.title}</Text>
        <StreakBadge count={streak?.currentCount ?? 0} />
      </View>
      <Text style={styles.meta}>
        {VERIFICATION_LABELS[habit.verificationMethod]} · {habit.cadence}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: "700",
    flexShrink: 1,
  },
  meta: {
    color: colors.textSecondary,
    fontSize: 13,
  },
});
