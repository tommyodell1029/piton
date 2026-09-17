import React, { useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { Button } from "@/components/Button";
import { VerificationMethodPicker } from "@/components/VerificationMethodPicker";
import { track, AnalyticsEvents } from "@/lib/analytics";
import { createHabit } from "@/lib/habits";
import { colors, spacing } from "@/theme/colors";
import type { HabitCategory, StreakCadence, VerificationMethod } from "@/types";

const CATEGORIES: HabitCategory[] = [
  "fitness",
  "reading",
  "meditation",
  "custom",
];
const CADENCES: StreakCadence[] = ["daily", "weekly", "monthly"];

export function CreateHabitScreen({ navigation }: any) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<HabitCategory>("fitness");
  const [cadence, setCadence] = useState<StreakCadence>("daily");
  const [method, setMethod] = useState<VerificationMethod | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    if (!title.trim() || !method) {
      setError("Give your habit a name and pick a verification method.");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const habit = await createHabit({
        title: title.trim(),
        category,
        cadence,
        verificationMethod: method,
      });
      track(AnalyticsEvents.HABIT_CREATED, { category, method });
      navigation.replace("HabitDetail", { habitId: habit.id });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create habit.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>New habit</Text>

      <TextInput
        style={styles.input}
        placeholder="e.g. Morning run"
        placeholderTextColor={colors.textSecondary}
        value={title}
        onChangeText={setTitle}
      />

      <Text style={styles.label}>Category</Text>
      <View style={styles.rowWrap}>
        {CATEGORIES.map((c) => (
          <Button
            key={c}
            label={c}
            variant={c === category ? "primary" : "secondary"}
            onPress={() => setCategory(c)}
          />
        ))}
      </View>

      <Text style={styles.label}>Cadence</Text>
      <View style={styles.rowWrap}>
        {CADENCES.map((c) => (
          <Button
            key={c}
            label={c}
            variant={c === cadence ? "primary" : "secondary"}
            onPress={() => setCadence(c)}
          />
        ))}
      </View>

      <Text style={styles.label}>How will you prove it?</Text>
      <VerificationMethodPicker value={method} onChange={setMethod} />

      {error && <Text style={styles.error}>{error}</Text>}

      <Button
        label="Create habit"
        onPress={handleCreate}
        loading={saving}
        style={styles.submit}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 24,
    fontWeight: "800",
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  label: {
    color: colors.textSecondary,
    fontWeight: "600",
    marginTop: spacing.sm,
  },
  rowWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  error: {
    color: colors.danger,
  },
  submit: {
    marginTop: spacing.lg,
  },
});
