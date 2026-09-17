import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useState } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";

import { listActiveChallenges, listFriends, listMyGroups } from "@/lib/social";
import type { Friend } from "@/lib/social";
import { colors, spacing } from "@/theme/colors";
import type { AccountabilityGroup, Challenge } from "@/types";

export function FriendsScreen() {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [groups, setGroups] = useState<AccountabilityGroup[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>([]);

  useFocusEffect(
    useCallback(() => {
      listFriends().then(setFriends);
      listMyGroups().then(setGroups);
      listActiveChallenges().then(setChallenges);
    }, []),
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Friends & groups</Text>

      <Text style={styles.sectionLabel}>Friends ({friends.length})</Text>
      <FlatList
        data={friends}
        keyExtractor={(item) => item.userId}
        renderItem={({ item }) => (
          <Text style={styles.rowText}>{item.displayName}</Text>
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>No friends added yet.</Text>
        }
      />

      <Text style={styles.sectionLabel}>Accountability groups</Text>
      <FlatList
        data={groups}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Text style={styles.rowText}>
            {item.name} · {item.memberCount} member
            {item.memberCount === 1 ? "" : "s"}
          </Text>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No groups yet.</Text>}
      />

      <Text style={styles.sectionLabel}>Active challenges</Text>
      <FlatList
        data={challenges}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Text style={styles.rowText}>{item.title}</Text>
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>No active challenges.</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 26,
    fontWeight: "800",
  },
  sectionLabel: {
    color: colors.textSecondary,
    fontWeight: "700",
    marginTop: spacing.lg,
  },
  rowText: {
    color: colors.textPrimary,
    paddingVertical: spacing.xs,
  },
  empty: {
    color: colors.textSecondary,
  },
});
