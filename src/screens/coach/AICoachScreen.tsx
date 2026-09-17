import React, { useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { Button } from "@/components/Button";
import { sendCoachMessage } from "@/lib/aiCoach";
import type { CoachMessage } from "@/lib/aiCoach";
import { track, AnalyticsEvents } from "@/lib/analytics";
import { colors, radii, spacing } from "@/theme/colors";

export function AICoachScreen() {
  const [messages, setMessages] = useState<CoachMessage[]>([
    {
      role: "assistant",
      content:
        "I'm your Piton coach. Ask me for motivation, insight on your streaks, or a new habit idea.",
    },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);

  async function handleSend() {
    if (!input.trim()) return;
    const userMessage: CoachMessage = { role: "user", content: input.trim() };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput("");
    setSending(true);
    try {
      const reply = await sendCoachMessage(nextMessages, userMessage.content);
      setMessages((prev) => [...prev, reply]);
      track(AnalyticsEvents.AI_COACH_MESSAGE_SENT, {});
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "The AI coach isn't reachable yet — deploy the `ai-coach` Supabase Edge Function with an OPENAI_API_KEY or ANTHROPIC_API_KEY secret to enable it.",
        },
      ]);
    } finally {
      setSending(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <FlatList
        data={messages}
        keyExtractor={(_, i) => String(i)}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View
            style={[
              styles.bubble,
              item.role === "user" ? styles.userBubble : styles.aiBubble,
            ]}
          >
            <Text style={styles.bubbleText}>{item.content}</Text>
          </View>
        )}
      />
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="Ask your coach..."
          placeholderTextColor={colors.textSecondary}
          value={input}
          onChangeText={setInput}
        />
        <Button label="Send" onPress={handleSend} loading={sending} />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  list: {
    padding: spacing.lg,
    gap: spacing.sm,
  },
  bubble: {
    borderRadius: radii.md,
    padding: spacing.md,
    maxWidth: "85%",
  },
  aiBubble: {
    backgroundColor: colors.surface,
    alignSelf: "flex-start",
  },
  userBubble: {
    backgroundColor: colors.accent,
    alignSelf: "flex-end",
  },
  bubbleText: {
    color: colors.textPrimary,
  },
  inputRow: {
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  input: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.border,
  },
});
