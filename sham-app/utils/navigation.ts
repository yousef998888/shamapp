import { router } from 'expo-router';

export const resetToHome = () => {
  // Reset navigation stack and go to home
  router.replace('/(tabs)');
};

export const goToAuth = () => {
  // Navigate to auth flow
  router.push('/auth/login');
};

export const goToLogin = () => {
  router.push('/auth/login');
};

export const goToSignup = () => {
  router.push('/auth/signup');
};
