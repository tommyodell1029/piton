import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useState } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";

import { Button } from "@/components/Button";
import { signOut } from "@/lib/auth";
import { getMyProfile, listMyBadges, xpForLevel } from "@/lib/gamification";
import { openCustomerCenter } from "@/lib/revenuecat";
import { colors, radii, spacing } from "@/theme/colors";
import type { Badge, UserProfile } from "@/types";

export function ProfileScreen({ navigation }: any) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [badges, setBadges] = useState<Badge[]>([]);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        setProfile(await getMyProfile());
        setBadges(await listMyBadges());
      })();
    }, []),
  );

  if (!profile) return null;

  const nextLevelXp = xpForLevel(profile.level + 1);
  const currentLevelXp = xpForLevel(profile.level);
  const progress =
    (profile.xp - currentLevelXp) / (nextLevelXp - currentLevelXp);

  return (
    <View style={styles.container}>
      <Text style={styles.name}>{profile.displayName}</Text>
      <Text style={styles.rank}>
        {profile.rank} · Level {profile.level}
      </Text>

      <View style={styles.progressTrack}>
        <View
          style={[
            styles.progressFill,
            { width: `${Math.min(progress * 100, 100)}%` },
          ]}
        />
      </View>
      <Text style={styles.xpLabel}>
        {profile.xp} XP {profile.isPremium ? "· Premium" : ""}
      </Text>

      <Text style={styles.sectionLabel}>Badges</Text>
      <FlatList
        data={badges}
        keyExtractor={(item) => item.id}
        horizontal
        renderItem={({ item }) => (
          <View style={styles.badge}>
            <Text style={styles.badgeTitle}>{item.title}</Text>
          </View>
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>No badges yet — keep proving it.</Text>
        }
      />

      {!profile.isPremium && (
        <Button
          label="Upgrade to Premium"
          onPress={() => navigation.navigate("Paywall")}
        />
      )}

      {profile.isPremium && (
        <Button
          label="Manage subscription"
          variant="ghost"
          onPress={() => openCustomerCenter()}
        />
      )}

      <Button
        label="Sign out"
        variant="ghost"
        onPress={signOut}
        style={styles.signOut}
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
  name: {
    color: colors.textPrimary,
    fontSize: 26,
    fontWeight: "800",
  },
  rank: {
    color: colors.accent,
    fontWeight: "700",
  },
  progressTrack: {
    height: 8,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceElevated,
    overflow: "hidden",
    marginTop: spacing.sm,
  },
  progressFill: {
    height: "100%",
    backgroundColor: colors.accent,
  },
  xpLabel: {
    color: colors.textSecondary,
  },
  sectionLabel: {
    color: colors.textSecondary,
    fontWeight: "700",
    marginTop: spacing.lg,
  },
  badge: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.md,
    marginRight: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  badgeTitle: {
    color: colors.textPrimary,
    fontWeight: "700",
  },
  empty: {
    color: colors.textSecondary,
  },
  signOut: {
    marginTop: "auto",
  },
});
