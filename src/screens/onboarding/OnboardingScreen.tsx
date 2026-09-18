import React, { useRef, useState } from "react";
import {
  Dimensions,
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { Button } from "@/components/Button";
import { track, AnalyticsEvents } from "@/lib/analytics";
import { markOnboardingComplete } from "@/lib/onboarding";
import { colors, radii, spacing } from "@/theme/colors";

interface Slide {
  key: string;
  eyebrow: string;
  title: string;
  body: string;
}

const SLIDES: Slide[] = [
  {
    key: "welcome",
    eyebrow: "PITON",
    title: "Don't check it off.\nProve it.",
    body: "Most habit apps run on the honor system. Piton doesn't — every habit you build gets verified.",
  },
  {
    key: "proof",
    eyebrow: "Pick your proof",
    title: "Photo, GPS, timer,\nhealth data, or AI",
    body: "A gym session gets a photo or GPS check. Reading gets a timer. Anything can get an AI-reviewed photo. You choose what fits.",
  },
  {
    key: "streaks",
    eyebrow: "Real streaks",
    title: "Streaks that\ncan't be faked",
    body: "Your streak only grows when proof is submitted and verified on our server — never just by tapping a checkbox.",
  },
  {
    key: "social",
    eyebrow: "Climb together",
    title: "Ready to\nprove it?",
    body: "Join accountability groups, challenge friends, and climb the leaderboard. Create your account to get started.",
  },
];

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export function OnboardingScreen({ onComplete }: { onComplete: () => void }) {
  const [index, setIndex] = useState(0);
  // The scroll settle event (onMomentumScrollEnd) can lag behind a fast
  // button tap, so `index` state alone isn't reliable to compute "next
  // slide" from — a ref tracks the intended index immediately and
  // authoritatively, independent of render/scroll-animation timing.
  const indexRef = useRef(0);
  const listRef = useRef<FlatList<Slide>>(null);
  const isLastSlide = index === SLIDES.length - 1;

  function goToIndex(newIndex: number) {
    indexRef.current = newIndex;
    setIndex(newIndex);
    track(AnalyticsEvents.ONBOARDING_SLIDE_VIEWED, {
      slide: SLIDES[newIndex].key,
    });
    listRef.current?.scrollToOffset({
      offset: newIndex * SCREEN_WIDTH,
      animated: true,
    });
  }

  function handleMomentumEnd(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const newIndex = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    if (newIndex !== indexRef.current) {
      indexRef.current = newIndex;
      setIndex(newIndex);
      track(AnalyticsEvents.ONBOARDING_SLIDE_VIEWED, {
        slide: SLIDES[newIndex].key,
      });
    }
  }

  function handleNext() {
    if (indexRef.current === SLIDES.length - 1) {
      track(AnalyticsEvents.ONBOARDING_COMPLETED, {});
      markOnboardingComplete();
      onComplete();
      return;
    }
    goToIndex(indexRef.current + 1);
  }

  function handleSkip() {
    track(AnalyticsEvents.ONBOARDING_SKIPPED, {
      fromSlide: SLIDES[indexRef.current].key,
    });
    markOnboardingComplete();
    onComplete();
  }

  return (
    <View style={styles.container}>
      {!isLastSlide && (
        <Button
          label="Skip"
          variant="ghost"
          onPress={handleSkip}
          style={styles.skipButton}
        />
      )}

      <FlatList
        ref={listRef}
        data={SLIDES}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.key}
        onMomentumScrollEnd={handleMomentumEnd}
        renderItem={({ item }) => (
          <View style={[styles.slide, { width: SCREEN_WIDTH }]}>
            <Text style={styles.eyebrow}>{item.eyebrow}</Text>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.body}>{item.body}</Text>
          </View>
        )}
      />

      <View style={styles.footer}>
        <View style={styles.dots}>
          {SLIDES.map((slide, i) => (
            <View
              key={slide.key}
              style={[styles.dot, i === index && styles.dotActive]}
            />
          ))}
        </View>
        <Button
          label={isLastSlide ? "Get started" : "Next"}
          onPress={handleNext}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  skipButton: {
    position: "absolute",
    top: spacing.xl,
    right: spacing.md,
    zIndex: 1,
  },
  slide: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  eyebrow: {
    color: colors.accent,
    fontWeight: "700",
    letterSpacing: 2,
    textTransform: "uppercase",
    fontSize: 13,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 34,
    fontWeight: "800",
    lineHeight: 40,
  },
  body: {
    color: colors.textSecondary,
    fontSize: 16,
    lineHeight: 24,
  },
  footer: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
    gap: spacing.lg,
  },
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    gap: spacing.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceElevated,
  },
  dotActive: {
    backgroundColor: colors.accent,
    width: 20,
  },
});
