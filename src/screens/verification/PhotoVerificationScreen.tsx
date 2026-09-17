import * as ImagePicker from "expo-image-picker";
import React, { useState } from "react";
import { Image, StyleSheet, Switch, Text, View } from "react-native";

import { Button } from "@/components/Button";
import { track, AnalyticsEvents } from "@/lib/analytics";
import { submitPhotoVerification } from "@/lib/verification";
import { colors, spacing } from "@/theme/colors";

export function PhotoVerificationScreen({ route, navigation }: any) {
  const { habitId } = route.params;
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [useAiReview, setUseAiReview] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pickPhoto(fromCamera: boolean) {
    const permission = fromCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      setError("Camera/photo permission is required to submit proof.");
      return;
    }

    const result = fromCamera
      ? await ImagePicker.launchCameraAsync({ quality: 0.7 })
      : await ImagePicker.launchImageLibraryAsync({ quality: 0.7 });

    if (!result.canceled) {
      setPhotoUri(result.assets[0].uri);
    }
  }

  async function handleSubmit() {
    if (!photoUri) {
      setError("Take or choose a photo first.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await submitPhotoVerification(habitId, photoUri, { useAiReview });
      track(AnalyticsEvents.VERIFICATION_SUBMITTED, {
        method: "photo",
        useAiReview,
      });
      navigation.goBack();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit proof.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Photo proof</Text>

      {photoUri && <Image source={{ uri: photoUri }} style={styles.preview} />}

      <Button
        label="Take photo"
        onPress={() => pickPhoto(true)}
        variant="secondary"
      />
      <Button
        label="Choose from library"
        onPress={() => pickPhoto(false)}
        variant="secondary"
      />

      <View style={styles.toggleRow}>
        <Text style={styles.toggleLabel}>AI-review this photo</Text>
        <Switch value={useAiReview} onValueChange={setUseAiReview} />
      </View>

      {error && <Text style={styles.error}>{error}</Text>}

      <Button
        label="Submit proof"
        onPress={handleSubmit}
        loading={submitting}
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
  preview: {
    width: "100%",
    height: 260,
    borderRadius: 16,
    backgroundColor: colors.surface,
  },
  toggleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  toggleLabel: {
    color: colors.textPrimary,
  },
  error: {
    color: colors.danger,
  },
});
