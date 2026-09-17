import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { Button } from "@/components/Button";
import { track, AnalyticsEvents } from "@/lib/analytics";
import {
  getTodayActivitySummary,
  requestHealthPermissions,
} from "@/lib/health";
import type { DailyActivitySummary } from "@/lib/health";
import { submitStepCountVerification } from "@/lib/verification";
import { colors, spacing } from "@/theme/colors";

export function HealthVerificationScreen({ route, navigation }: any) {
  const { habitId } = route.params;
  const [summary, setSummary] = useState<DailyActivitySummary | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      await requestHealthPermissions();
      setSummary(await getTodayActivitySummary());
    })();
  }, []);

  async function handleSubmit() {
    if (!summary) return;
    setSubmitting(true);
    try {
      await submitStepCountVerification(habitId, summary.steps);
      track(AnalyticsEvents.VERIFICATION_SUBMITTED, {
        method: "health",
        steps: summary.steps,
      });
      navigation.goBack();
    } finally {
      setSubmitting(false);
    }
  }

  const unavailable = summary?.source === "unavailable";

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Health data proof</Text>

      {unavailable ? (
        <Text style={styles.warning}>
          HealthKit / Health Connect isn't wired up in this build yet — it
          requires a native module and a custom dev client (see
          src/lib/health.ts). Once configured, today's steps/workout data will
          appear here automatically.
        </Text>
      ) : (
        <Text style={styles.body}>Steps today: {summary?.steps ?? "-"}</Text>
      )}

      <Button
        label="Submit"
        onPress={handleSubmit}
        loading={submitting}
        disabled={unavailable}
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
    fontSize: 24,
    fontWeight: "800",
  },
  body: {
    color: colors.textPrimary,
    fontSize: 18,
  },
  warning: {
    color: colors.gold,
  },
});
