import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useState } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";

import { getGlobalLeaderboard } from "@/lib/gamification";
import { colors, spacing } from "@/theme/colors";
import type { LeaderboardEntry } from "@/types";

export function LeaderboardScreen() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);

  useFocusEffect(
    useCallback(() => {
      getGlobalLeaderboard().then(setEntries);
    }, []),
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Leaderboard</Text>
      <FlatList
        data={entries}
        keyExtractor={(item) => item.userId}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Text style={styles.rank}>#{item.rank}</Text>
            <Text style={styles.name}>{item.displayName}</Text>
            <Text style={styles.xp}>{item.xp} XP</Text>
          </View>
        )}
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
  title: {
    color: colors.textPrimary,
    fontSize: 26,
    fontWeight: "800",
    marginBottom: spacing.md,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.sm,
  },
  rank: {
    color: colors.accent,
    fontWeight: "800",
    width: 40,
  },
  name: {
    color: colors.textPrimary,
    flex: 1,
  },
  xp: {
    color: colors.textSecondary,
  },
});
