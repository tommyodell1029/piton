import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import React from "react";

import { AICoachScreen } from "@/screens/coach/AICoachScreen";
import { CreateHabitScreen } from "@/screens/habits/CreateHabitScreen";
import { HabitDetailScreen } from "@/screens/habits/HabitDetailScreen";
import { HabitListScreen } from "@/screens/habits/HabitListScreen";
import { ProfileScreen } from "@/screens/profile/ProfileScreen";
import { FriendsScreen } from "@/screens/social/FriendsScreen";
import { LeaderboardScreen } from "@/screens/social/LeaderboardScreen";
import { HealthVerificationScreen } from "@/screens/verification/HealthVerificationScreen";
import { LocationVerificationScreen } from "@/screens/verification/LocationVerificationScreen";
import { PhotoVerificationScreen } from "@/screens/verification/PhotoVerificationScreen";
import { TimerVerificationScreen } from "@/screens/verification/TimerVerificationScreen";
import { colors } from "@/theme/colors";

const HabitsStack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function HabitsStackNavigator() {
  return (
    <HabitsStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.textPrimary,
      }}
    >
      <HabitsStack.Screen
        name="HabitList"
        component={HabitListScreen}
        options={{ title: "Habits" }}
      />
      <HabitsStack.Screen
        name="CreateHabit"
        component={CreateHabitScreen}
        options={{ title: "New habit" }}
      />
      <HabitsStack.Screen
        name="HabitDetail"
        component={HabitDetailScreen}
        options={{ title: "" }}
      />
      <HabitsStack.Screen
        name="PhotoVerification"
        component={PhotoVerificationScreen}
        options={{ title: "Prove it" }}
      />
      <HabitsStack.Screen
        name="TimerVerification"
        component={TimerVerificationScreen}
        options={{ title: "Prove it" }}
      />
      <HabitsStack.Screen
        name="LocationVerification"
        component={LocationVerificationScreen}
        options={{ title: "Prove it" }}
      />
      <HabitsStack.Screen
        name="HealthVerification"
        component={HealthVerificationScreen}
        options={{ title: "Prove it" }}
      />
    </HabitsStack.Navigator>
  );
}

export function MainTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textSecondary,
      }}
    >
      <Tab.Screen name="Habits" component={HabitsStackNavigator} />
      <Tab.Screen name="Leaderboard" component={LeaderboardScreen} />
      <Tab.Screen name="Friends" component={FriendsScreen} />
      <Tab.Screen name="Coach" component={AICoachScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}
