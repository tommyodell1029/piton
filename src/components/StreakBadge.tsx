import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { colors, radii, spacing } from "@/theme/colors";

export function StreakBadge({ count }: { count: number }) {
  const isHot = count >= 7;
  return (
    <View style={[styles.container, isHot && styles.hot]}>
      <Text style={styles.icon}>{isHot ? "🔥" : "•"}</Text>
      <Text style={styles.text}>
        {count} day{count === 1 ? "" : "s"}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.pill,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    alignSelf: "flex-start",
  },
  hot: {
    backgroundColor: colors.accentMuted,
  },
  icon: {
    fontSize: 14,
  },
  text: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: "600",
  },
});
