import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useState } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";

import { Button } from "@/components/Button";
import { track, AnalyticsEvents } from "@/lib/analytics";
import {
  getPaywallPackages,
  purchasePackageById,
  restorePurchases,
} from "@/lib/revenuecat";
import type { PaywallPackage } from "@/lib/revenuecat";
import { colors, radii, spacing } from "@/theme/colors";

export function PaywallScreen({ navigation }: any) {
  const [packages, setPackages] = useState<PaywallPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasingId, setPurchasingId] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      track(AnalyticsEvents.PAYWALL_VIEWED, {});
      setLoading(true);
      getPaywallPackages()
        .then(setPackages)
        .finally(() => setLoading(false));
    }, []),
  );

  async function handlePurchase(pkg: PaywallPackage) {
    setError(null);
    setPurchasingId(pkg.identifier);
    try {
      const outcome = await purchasePackageById(pkg.identifier);
      if (outcome.status === "purchased" && outcome.isPremium) {
        track(AnalyticsEvents.SUBSCRIPTION_STARTED, {
          package: pkg.identifier,
        });
        navigation.goBack();
      } else if (outcome.status === "error") {
        setError(outcome.message);
      }
      // "cancelled" (user backed out of the native purchase sheet) is not
      // an error — leave the screen as-is with no message.
    } finally {
      setPurchasingId(null);
    }
  }

  async function handleRestore() {
    setError(null);
    setRestoring(true);
    try {
      const outcome = await restorePurchases();
      if (outcome.status === "purchased" && outcome.isPremium) {
        navigation.goBack();
      } else if (outcome.status === "purchased") {
        setError("Restored, but no active Premium subscription was found.");
      } else if (outcome.status === "error") {
        setError(outcome.message);
      }
    } finally {
      setRestoring(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Piton Premium</Text>
      <Text style={styles.body}>
        Unlimited habits, advanced AI verification, accountability groups, and
        deeper analytics.
      </Text>

      {loading ? (
        <Text style={styles.empty}>Loading plans…</Text>
      ) : (
        <FlatList
          data={packages}
          keyExtractor={(item) => item.identifier}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
          renderItem={({ item }) => (
            <View style={styles.planCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.planTitle}>{item.title}</Text>
                <Text style={styles.planPrice}>{item.priceString}</Text>
              </View>
              <Button
                label="Choose"
                onPress={() => handlePurchase(item)}
                loading={purchasingId === item.identifier}
              />
            </View>
          )}
          ListEmptyComponent={
            <Text style={styles.empty}>
              No plans available yet — RevenueCat needs an API key and
              configured offerings, plus an EAS dev client build to run on a
              real device.
            </Text>
          }
        />
      )}

      {error && <Text style={styles.error}>{error}</Text>}

      <Button
        label="Restore purchases"
        variant="ghost"
        onPress={handleRestore}
        loading={restoring}
      />

      <Button
        label="Not now"
        variant="ghost"
        onPress={() => navigation.goBack()}
      />
    </View>
  );
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
  body: {
    color: colors.textSecondary,
  },
  list: {
    flexGrow: 0,
  },
  planCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  planTitle: {
    color: colors.textPrimary,
    fontWeight: "700",
    fontSize: 16,
  },
  planPrice: {
    color: colors.accent,
    fontWeight: "700",
  },
  empty: {
    color: colors.textSecondary,
  },
  error: {
    color: colors.danger,
  },
});
