import * as AppleAuthentication from "expo-apple-authentication";
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import React, { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
} from "react-native";

import { Button } from "@/components/Button";
import {
  signInWithApple,
  signInWithEmail,
  signInWithGoogleIdToken,
} from "@/lib/auth";
import { colors, spacing } from "@/theme/colors";

WebBrowser.maybeCompleteAuthSession();

const googleClientIds = {
  iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
  androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
};
const googleConfigured = Boolean(
  googleClientIds.iosClientId ||
  googleClientIds.androidClientId ||
  googleClientIds.webClientId,
);

export function SignInScreen({ navigation }: any) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [, googleResponse, promptGoogleSignIn] =
    Google.useIdTokenAuthRequest(googleClientIds);

  useEffect(() => {
    if (googleResponse?.type === "success" && googleResponse.params.id_token) {
      signInWithGoogleIdToken(googleResponse.params.id_token).catch((err) =>
        setError(err instanceof Error ? err.message : "Google sign-in failed."),
      );
    }
  }, [googleResponse]);

  async function handleEmailSignIn() {
    setError(null);
    setLoading(true);
    try {
      await signInWithEmail(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed.");
    } finally {
      setLoading(false);
    }
  }

  async function handleAppleSignIn() {
    setError(null);
    try {
      await signInWithApple();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Apple sign-in failed.");
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Text style={styles.logo}>PITON</Text>
      <Text style={styles.tagline}>Don't check it off. Prove it.</Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor={colors.textSecondary}
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        placeholderTextColor={colors.textSecondary}
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      {error && <Text style={styles.error}>{error}</Text>}

      <Button label="Sign in" onPress={handleEmailSignIn} loading={loading} />

      {Platform.OS === "ios" && (
        <AppleAuthentication.AppleAuthenticationButton
          buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
          buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
          cornerRadius={12}
          style={styles.appleButton}
          onPress={handleAppleSignIn}
        />
      )}

      {googleConfigured && (
        <Button
          label="Continue with Google"
          variant="secondary"
          onPress={() => promptGoogleSignIn()}
        />
      )}

      <Button
        label="Create an account"
        variant="ghost"
        onPress={() => navigation.navigate("SignUp")}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: "center",
    padding: spacing.lg,
    gap: spacing.md,
  },
  logo: {
    color: colors.textPrimary,
    fontSize: 40,
    fontWeight: "900",
    textAlign: "center",
    letterSpacing: 4,
  },
  tagline: {
    color: colors.accent,
    textAlign: "center",
    marginBottom: spacing.lg,
    fontWeight: "600",
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  error: {
    color: colors.danger,
    textAlign: "center",
  },
  appleButton: {
    height: 48,
  },
});
