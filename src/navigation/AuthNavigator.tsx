import { createNativeStackNavigator } from "@react-navigation/native-stack";
import React from "react";

import { SignInScreen } from "@/screens/auth/SignInScreen";
import { SignUpScreen } from "@/screens/auth/SignUpScreen";

const Stack = createNativeStackNavigator();

export function AuthNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="SignIn" component={SignInScreen} />
      <Stack.Screen name="SignUp" component={SignUpScreen} />
    </Stack.Navigator>
  );
}
