import * as Location from "expo-location";
import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { Button } from "@/components/Button";
import { track, AnalyticsEvents } from "@/lib/analytics";
import { submitGpsVerification } from "@/lib/verification";
import { colors, spacing } from "@/theme/colors";

export function LocationVerificationScreen({ route, navigation }: any) {
  const { habitId } = route.params;
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [captured, setCaptured] = useState<Location.LocationObject | null>(
    null,
  );

  async function handleCapture() {
    setError(null);
    const permission = await Location.requestForegroundPermissionsAsync();
    if (!permission.granted) {
      setError("Location permission is required to verify this habit.");
      return;
    }
    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });
    setCaptured(position);
  }

  async function handleSubmit() {
    if (!captured) return;
    setSubmitting(true);
    try {
      await submitGpsVerification(habitId, {
        latitude: captured.coords.latitude,
        longitude: captured.coords.longitude,
        accuracy: captured.coords.accuracy,
      });
      track(AnalyticsEvents.VERIFICATION_SUBMITTED, { method: "gps" });
      navigation.goBack();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not submit location proof.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Location proof</Text>
      <Text style={styles.body}>
        Capture your current location to verify you're at the right spot (e.g.
        the gym or trailhead).
      </Text>

      {captured && (
        <Text style={styles.coords}>
          {captured.coords.latitude.toFixed(5)},{" "}
          {captured.coords.longitude.toFixed(5)}
          {"\n"}accuracy: {Math.round(captured.coords.accuracy ?? 0)}m
        </Text>
      )}

      {error && <Text style={styles.error}>{error}</Text>}

      <Button
        label="Capture location"
        onPress={handleCapture}
        variant="secondary"
      />
      <Button
        label="Submit"
        onPress={handleSubmit}
        loading={submitting}
        disabled={!captured}
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
    color: colors.textSecondary,
  },
  coords: {
    color: colors.textPrimary,
    fontVariant: ["tabular-nums"],
  },
  error: {
    color: colors.danger,
  },
});
