import { Stack } from 'expo-router';

export default function AuthLayout() {
  // Note: RTL is handled globally in app/_layout.tsx
  // No need to duplicate the logic here
  
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="login" />
      <Stack.Screen name="signup" />
    </Stack>
  );
}
