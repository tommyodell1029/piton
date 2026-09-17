import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useState } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";

import { Button } from "@/components/Button";
import { HabitCard } from "@/components/HabitCard";
import { listMyHabits } from "@/lib/habits";
import { listMyStreaks } from "@/lib/streaks";
import { colors, spacing } from "@/theme/colors";
import type { Habit, Streak } from "@/types";

export function HabitListScreen({ navigation }: any) {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [streaksByHabit, setStreaksByHabit] = useState<Record<string, Streak>>(
    {},
  );
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [habitRows, streakRows] = await Promise.all([
        listMyHabits(),
        listMyStreaks(),
      ]);
      setHabits(habitRows);
      setStreaksByHabit(
        Object.fromEntries(streakRows.map((s) => [s.habitId, s])),
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Your habits</Text>
        <Button
          label="+ New"
          onPress={() => navigation.navigate("CreateHabit")}
        />
      </View>

      <FlatList
        data={habits}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshing={loading}
        onRefresh={load}
        ListEmptyComponent={
          !loading ? (
            <Text style={styles.empty}>
              No habits yet. Create one and pick a way to prove it.
            </Text>
          ) : null
        }
        renderItem={({ item }) => (
          <HabitCard
            habit={item}
            streak={streaksByHabit[item.id]}
            onPress={() =>
              navigation.navigate("HabitDetail", { habitId: item.id })
            }
          />
        )}
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.lg,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 28,
    fontWeight: "800",
  },
  list: {
    paddingBottom: spacing.xl,
  },
  empty: {
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: spacing.xl,
  },
});
