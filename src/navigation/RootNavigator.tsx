import { NavigationContainer } from "@react-navigation/native";
import type { Session } from "@supabase/supabase-js";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";

import { AuthNavigator } from "./AuthNavigator";
import { MainTabNavigator } from "./MainTabNavigator";

import { initAnalytics, identify } from "@/lib/analytics";
import { initNotifications } from "@/lib/notifications";
import { hasCompletedOnboarding } from "@/lib/onboarding";
import { initRevenueCat } from "@/lib/revenuecat";
import { supabase } from "@/lib/supabase";
import { OnboardingScreen } from "@/screens/onboarding/OnboardingScreen";
import { colors } from "@/theme/colors";

export function RootNavigator() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  useEffect(() => {
    initAnalytics();

    Promise.all([supabase.auth.getSession(), hasCompletedOnboarding()]).then(
      ([
        {
          data: { session },
        },
        completed,
      ]) => {
        setSession(session);
        setNeedsOnboarding(!completed);
        setLoading(false);
      },
    );

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session?.user) return;
    identify(session.user.id, { email: session.user.email ?? "" });
    initNotifications(session.user.id);
    initRevenueCat(session.user.id);
  }, [session?.user?.id]);

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.background,
          justifyContent: "center",
        }}
      >
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (!session && needsOnboarding) {
    return <OnboardingScreen onComplete={() => setNeedsOnboarding(false)} />;
  }

  return (
    <NavigationContainer>
      {session ? <MainTabNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
}
