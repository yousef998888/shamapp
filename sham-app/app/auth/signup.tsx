import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useAuthContext } from '@/contexts/AuthContext';
import { SafeAreaView } from 'react-native-safe-area-context';

import { router } from 'expo-router';
import { usePageTranslation } from '@/hooks/useTranslation';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { UI } from '@/constants/theme';

export default function SignupScreen() {
  const { signUpWithEmail, signUpWithGoogle, signUpLoading, signUpError } = useAuthContext();
  const { t, isRTL } = usePageTranslation('authPages');
  
  console.log('🟢 SignupScreen rendered', { 
    hasSignUpWithEmail: !!signUpWithEmail, 
    signUpLoading, 
    signUpError 
  });
  
  // Show alerts for errors
  useEffect(() => {
    if (signUpError) {
      console.log('🔴 signUpError detected:', signUpError);
      Alert.alert(
        t.error || 'Error',
        signUpError,
        [{ text: 'OK' }]
      );
    }
  }, [signUpError, t.error]);


  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreeToTerms, setAgreeToTerms] = useState(false);

  const handleSignup = () => {
    console.log('🔵 handleSignup called!', { email, password, confirmPassword, agreeToTerms });
    console.log('🔵 signUpLoading:', signUpLoading);
    console.log('🔵 signUpWithEmail function:', typeof signUpWithEmail);
    
    if (!email || !password || !confirmPassword) {
      console.log('❌ Validation failed: missing fields');
      Alert.alert(t.error || 'Error', t.fillAllFields || 'Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      console.log('❌ Validation failed: passwords do not match');
      Alert.alert(t.error || 'Error', t.passwordsDoNotMatch || 'Passwords do not match');
      return;
    }

    if (!agreeToTerms) {
      console.log('❌ Validation failed: terms not agreed');
      Alert.alert(t.error || 'Error', t.agreeToTermsError || 'Please agree to the terms and conditions');
      return;
    }

    console.log('✅ All validations passed, calling signUpWithEmail...');
    try {
      signUpWithEmail(email, password);
      console.log('✅ signUpWithEmail called successfully');
    } catch (error) {
      console.error('❌ Error calling signUpWithEmail:', error);
      Alert.alert('Error', 'Failed to start signup. Please try again.');
    }
  };

  const handleGoogleSignup = () => {
    signUpWithGoogle();
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Logo and Title */}
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <View style={styles.logo}>
                <Text style={styles.logoText}>S</Text>
              </View>
            </View>
            <Text style={styles.title}>{t.signupTitle || 'Create Account'}</Text>
            <Text style={styles.subtitle}>{t.signupSubtitle || 'Join cognicart today'}</Text>
          </View>
          <View style={[
            styles.languageSwitcherContainer,
            isRTL && styles.languageSwitcherContainerRTL
          ]}>
            <LanguageSwitcher variant="compact" />
          </View>

          {/* Form */}
          <View style={styles.form}>
            {/* Email Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>{t.email || 'Email'}</Text>
              <View style={styles.inputWrapper}>
                <View style={[styles.inputIcon, isRTL && styles.inputIconRTL]}>
                  <Text style={styles.iconText}>@</Text>
                </View>
                <TextInput
                  style={[styles.textInput, { textAlign: isRTL ? 'right' : 'left' }]}
                  placeholder={t.enterEmail || 'Enter your email'}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </View>

            {/* Password Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>{t.password || 'Password'}</Text>
              <View style={styles.inputWrapper}>
                <View style={[styles.inputIcon, isRTL && styles.inputIconRTL]}>
                  <Text style={styles.iconText}>🔒</Text>
                </View>
                <TextInput
                  style={[styles.textInput, { textAlign: isRTL ? 'right' : 'left' }]}
                  placeholder={t.createPassword || 'Create a password'}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  style={styles.inputAction}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <Text style={styles.actionText}>{showPassword ? '👁️' : '👁️‍🗨️'}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Confirm Password Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>{t.confirmPassword || 'Confirm Password'}</Text>
              <View style={styles.inputWrapper}>
                <View style={[styles.inputIcon, isRTL && styles.inputIconRTL]}>
                  <Text style={styles.iconText}>🔒</Text>
                </View>
                <TextInput
                  style={[styles.textInput, { textAlign: isRTL ? 'right' : 'left' }]}
                  placeholder={t.confirmYourPassword || 'Confirm your password'}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  style={styles.inputAction}
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  <Text style={styles.actionText}>{showConfirmPassword ? '👁️' : '👁️‍🗨️'}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Terms Agreement */}
            <View style={styles.termsContainer}>
              <TouchableOpacity
                style={[styles.checkbox, agreeToTerms && styles.checkboxChecked, isRTL && styles.checkboxRTL]}
                onPress={() => setAgreeToTerms(!agreeToTerms)}
              >
                {agreeToTerms && <Text style={styles.checkmark}>✓</Text>}
              </TouchableOpacity>
              <Text style={styles.termsText}>
                {t.agreeToTerms || 'I agree to the'}{' '}
                <Text style={styles.termsLink}>{t.termsOfService || 'Terms of Service'}</Text>
                {' '}{t.and || 'and'}{' '}
                <Text style={styles.termsLink}>{t.privacyPolicy || 'Privacy Policy'}</Text>
              </Text>
            </View>

            {/* Error Notification */}
            {signUpError && (
              <View style={styles.notification}>
                <View style={styles.notificationContent}>
                  <View style={styles.notificationIcon}>
                    <Text style={styles.notificationIconText}>ℹ️</Text>
                  </View>
                  <View style={styles.notificationText}>
                    <Text style={styles.notificationTitle}>{t.error || 'Error'}</Text>
                    <Text style={styles.notificationMessage}>{signUpError}</Text>
                  </View>
                  <TouchableOpacity style={styles.notificationClose}>
                    <Text style={styles.notificationCloseText}>✕</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Signup Buttons */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.primaryButton, signUpLoading && styles.buttonDisabled]}
                onPress={() => {
                  console.log('🔴 Button pressed!');
                  handleSignup();
                }}
                disabled={signUpLoading}
                activeOpacity={0.7}
              >
                <Text style={styles.primaryButtonText}>
                  {signUpLoading ? (t.creatingAccount || 'Creating Account...') : (t.createAccount || 'Create Account')}
                </Text>
              </TouchableOpacity>

              {/* Sign In Link */}
              <TouchableOpacity
                style={styles.signInLink}
                onPress={() => router.push('/auth/login')}
              >
                <Text style={styles.signInLinkText}>{t.alreadyHaveAccount || 'Already have an account? Sign In'}</Text>
              </TouchableOpacity>
              {/* <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => router.push('/auth/login')}
              >
                <Text style={styles.secondaryButtonText}>{t.alreadyHaveAccount || 'Already have an account? Sign In'}</Text>
              </TouchableOpacity> */}
            </View>

            {/* Divider */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>{t.or || 'OR'}</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Google Signup */}
            <TouchableOpacity style={styles.googleButton} onPress={handleGoogleSignup}>
              <Text style={styles.googleButtonText}>{t.continueWithGoogle || 'Continue with Google'}</Text>
            </TouchableOpacity>


          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FCFE',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingTop: 76,
    paddingBottom: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoContainer: {
    marginBottom: 24,
  },
  logo: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#61d5b6',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#61d5b6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.24,
    shadowRadius: 16,
    elevation: 8,
  },
  logoText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
  form: {
    flex: 1,
  },
  inputContainer: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: UI.colors.background,
    borderWidth: UI.dimensions.borderWidth,
    borderColor: UI.colors.border,
    borderRadius: UI.dimensions.borderRadius,
    paddingHorizontal: 16,
    height: UI.dimensions.inputHeight,
  },
  inputIcon: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  inputIconRTL: {
    marginRight: 0,
    marginLeft: 8,
  },
  iconText: {
    fontSize: 16,
    color: '#4B5563',
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: '#1F2937',
    paddingVertical: 0,
  },
  inputAction: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: {
    fontSize: 16,
    color: '#CBD5E1',
  },
  termsContainer: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'flex-start',
    alignItems: 'center',
    marginBottom: 12,
  },
  termsContainerRTL: {
    alignItems: 'center',
    flexDirection: 'row-reverse',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#61d5b6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    marginTop: 2,
  },
  checkboxRTL: {
    marginRight: 0,
    marginLeft: 8,
  },
  checkboxChecked: {
    backgroundColor: '#61d5b6',
  },
  checkmark: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  termsText: {
    flex: 1,
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  termsLink: {
    color: '#61d5b6',
    fontWeight: '600',
  },
  notification: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#F43F5E',
    borderRadius: 16,
    padding: 12,
    marginBottom: 24,
  },
  notificationContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  notificationIcon: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  notificationIconText: {
    fontSize: 16,
    color: '#F43F5E',
  },
  notificationText: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  notificationMessage: {
    fontSize: 14,
    color: '#6B7280',
  },
  notificationClose: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationCloseText: {
    fontSize: 16,
    color: '#6B7280',
  },
  buttonContainer: {
    marginBottom: 12,
  },
  primaryButton: {
    backgroundColor: UI.colors.primary,
    height: UI.dimensions.buttonHeight,
    borderRadius: UI.dimensions.borderRadius,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    borderWidth: UI.dimensions.borderWidth,
    borderColor: UI.colors.primary,
    height: UI.dimensions.buttonHeight,
    borderRadius: UI.dimensions.borderRadius,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    color: '#61d5b6',
    fontSize: 16,
    fontWeight: '600',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#CBD5E1',
  },
  dividerText: {
    marginHorizontal: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  googleButton: {
    backgroundColor: UI.colors.background,
    height: UI.dimensions.buttonHeight,
    borderRadius: UI.dimensions.borderRadius,
    borderWidth: UI.dimensions.borderWidth,
    borderColor: UI.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.02,
    shadowRadius: 16,
    elevation: 4,
    marginBottom: 16,
  },
  googleButtonText: {
    color: '#1F2937',
    fontSize: 16,
    fontWeight: '600',
  },
  signInLink: {
    alignItems: 'center',
    marginTop: 16,
  },
  signInLinkText: {
    color: '#61d5b6',
    fontSize: 16,
    fontWeight: '600',
  },
  languageSwitcherContainer: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10,
  },
  languageSwitcherContainerRTL: {
    right: 'auto',
    left: 16,
  },
});
