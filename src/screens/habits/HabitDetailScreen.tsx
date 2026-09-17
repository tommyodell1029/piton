import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useState } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";

import { Button } from "@/components/Button";
import { StreakBadge } from "@/components/StreakBadge";
import { listMyHabits } from "@/lib/habits";
import { getStreakForHabit } from "@/lib/streaks";
import { listVerificationsForHabit } from "@/lib/verification";
import { colors, spacing } from "@/theme/colors";
import type { Habit, HabitVerification, Streak } from "@/types";

const VERIFICATION_SCREEN_BY_METHOD: Record<
  Habit["verificationMethod"],
  string
> = {
  healthkit: "HealthVerification",
  health_connect: "HealthVerification",
  photo: "PhotoVerification",
  ai_image: "PhotoVerification",
  gps: "LocationVerification",
  timer: "TimerVerification",
  step_count: "HealthVerification",
  workout: "HealthVerification",
  manual_ai_review: "PhotoVerification",
};

export function HabitDetailScreen({ route, navigation }: any) {
  const { habitId } = route.params;
  const [habit, setHabit] = useState<Habit | null>(null);
  const [streak, setStreak] = useState<Streak | null>(null);
  const [verifications, setVerifications] = useState<HabitVerification[]>([]);

  const load = useCallback(async () => {
    const habits = await listMyHabits();
    const found = habits.find((h) => h.id === habitId) ?? null;
    setHabit(found);
    const [streakRow, verificationRows] = await Promise.all([
      getStreakForHabit(habitId),
      listVerificationsForHabit(habitId),
    ]);
    setStreak(streakRow);
    setVerifications(verificationRows);
  }, [habitId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  if (!habit) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{habit.title}</Text>
      <StreakBadge count={streak?.currentCount ?? 0} />

      <Button
        label="Prove it"
        style={styles.proveButton}
        onPress={() =>
          navigation.navigate(
            VERIFICATION_SCREEN_BY_METHOD[habit.verificationMethod],
            {
              habitId: habit.id,
            },
          )
        }
      />

      <Text style={styles.sectionLabel}>History</Text>
      <FlatList
        data={verifications}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.historyRow}>
            <Text style={styles.historyDate}>
              {new Date(item.submittedAt).toLocaleDateString()}
            </Text>
            <Text style={[styles.historyStatus, statusStyle(item.status)]}>
              {item.status}
            </Text>
          </View>
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>No submissions yet.</Text>
        }
      />
    </View>
  );
}

function statusStyle(status: HabitVerification["status"]) {
  if (status === "approved") return { color: colors.success };
  if (status === "rejected") return { color: colors.danger };
  return { color: colors.gold };
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.lg,
    gap: spacing.md,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 26,
    fontWeight: "800",
  },
  proveButton: {
    marginVertical: spacing.md,
  },
  sectionLabel: {
    color: colors.textSecondary,
    fontWeight: "700",
  },
  historyRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  historyDate: {
    color: colors.textPrimary,
  },
  historyStatus: {
    fontWeight: "700",
    textTransform: "capitalize",
  },
  empty: {
    color: colors.textSecondary,
  },
});
