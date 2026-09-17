import React, { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { Button } from "@/components/Button";
import { track, AnalyticsEvents } from "@/lib/analytics";
import { submitTimerVerification } from "@/lib/verification";
import { colors, spacing } from "@/theme/colors";

function formatDuration(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

export function TimerVerificationScreen({ route, navigation }: any) {
  const { habitId } = route.params;
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running]);

  async function handleSubmit() {
    setRunning(false);
    setSubmitting(true);
    try {
      await submitTimerVerification(habitId, seconds);
      track(AnalyticsEvents.VERIFICATION_SUBMITTED, {
        method: "timer",
        durationSeconds: seconds,
      });
      navigation.goBack();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Timer proof</Text>
      <Text style={styles.clock}>{formatDuration(seconds)}</Text>

      <View style={styles.row}>
        <Button
          label={running ? "Pause" : "Start"}
          onPress={() => setRunning((r) => !r)}
          variant="secondary"
        />
        <Button label="Reset" onPress={() => setSeconds(0)} variant="ghost" />
      </View>

      <Button
        label="Submit"
        onPress={handleSubmit}
        loading={submitting}
        disabled={seconds === 0}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.lg,
    gap: spacing.lg,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    color: colors.textPrimary,
    fontSize: 24,
    fontWeight: "800",
  },
  clock: {
    color: colors.accent,
    fontSize: 56,
    fontWeight: "900",
    fontVariant: ["tabular-nums"],
  },
  row: {
    flexDirection: "row",
    gap: spacing.md,
  },
});
