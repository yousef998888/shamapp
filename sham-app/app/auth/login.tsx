import React, { useState } from 'react';
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
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthContext } from '@/contexts/AuthContext';
import { router } from 'expo-router';
import { usePageTranslation } from '@/hooks/useTranslation';
import Ionicons from '@expo/vector-icons/Ionicons';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { UI } from '@/constants/theme';

export default function LoginScreen() {
  const { signInWithEmail, signInWithGoogle, signInLoading, signInError } = useAuthContext();
  const { t, isRTL } = usePageTranslation('authPages');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const handleLogin = () => {
    if (!email || !password) {
      Alert.alert(t.error || 'Error', t.fillAllFields || 'Please fill in all fields');
      return;
    }
    signInWithEmail(email, password);
  };

  const handleGoogleLogin = () => {
    signInWithGoogle();
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
            <Text style={styles.title}>{t.loginTitle || 'Sign In to cognicart'}</Text>
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
                {/* <View style={styles.inputIcon}>
                  <Text style={styles.iconText}>@</Text>
                </View> */}
                <TouchableOpacity style={styles.inputAction}>
                  <Ionicons name="close" size={24} color="black" />
                </TouchableOpacity>
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
              <Text style={styles.inputHelper}>{t.validEmailHelper || 'Enter a valid email address'}</Text>
            </View>

            {/* Password Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>{t.password || 'Password'}</Text>
              <View style={[styles.inputWrapper, styles.passwordInput]}>
                {/* <View style={styles.inputIcon}>
                  <Text style={styles.iconText}>🔒</Text>
                </View> */}
                <TouchableOpacity
                  style={styles.inputAction}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <Ionicons name="eye" size={20} color="black" /> : <Ionicons name="eye-off" size={20} color="black" />}
                </TouchableOpacity>
                <TextInput

                  style={[styles.textInput, { textAlign: isRTL ? 'right' : 'left' }]}
                  //style={[styles.textInput, { textAlign: isRTL ? 'right' : 'left' }]}
                  placeholder={t.enterPassword || 'Enter your password'}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />

              </View>
              <Text style={[styles.inputHelper, styles.errorText]}>{t.passwordRequired || 'Password is required'}</Text>
            </View>

            {/* Remember Me */}
            <View style={styles.rememberContainer}>
              <TouchableOpacity
                style={[styles.checkbox, rememberMe && styles.checkboxChecked, isRTL && styles.checkboxRTL]}
                onPress={() => setRememberMe(!rememberMe)}
              >
                {rememberMe && <Text style={styles.checkmark}>✓</Text>}
              </TouchableOpacity>
              <Text style={styles.rememberText}>{t.rememberMe || 'Remember me'}</Text>
            </View>

            {/* Error Notification */}
            {signInError && (
              <View style={styles.notification}>
                <View style={styles.notificationContent}>
                  <View style={styles.notificationIcon}>
                    <Text style={styles.notificationIconText}>ℹ️</Text>
                  </View>
                  <View style={styles.notificationText}>
                    <Text style={styles.notificationTitle}>{t.error || 'Error'}</Text>
                    <Text style={styles.notificationMessage}>{signInError}</Text>
                  </View>
                  <TouchableOpacity style={styles.notificationButton}>
                    <Text style={styles.notificationButtonText}>{t.fix || 'Fix'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.notificationClose}>
                    <Text style={styles.notificationCloseText}>✕</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Login Buttons */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.primaryButton, signInLoading && styles.buttonDisabled]}
                onPress={handleLogin}
                disabled={signInLoading}
              >
                <Text style={styles.primaryButtonText}>
                  {signInLoading ? (t.signingIn || 'Signing In...') : (t.signIn || 'Sign In')}
                </Text>
              </TouchableOpacity>
              {/* Sign Up Link */}
              <TouchableOpacity
                style={styles.signUpLink}
                onPress={() => router.push('/auth/signup')}
              >
                <Text style={styles.signUpLinkText}>{t.dontHaveAccount || 'Don\'t have an account? Sign Up'}</Text>
              </TouchableOpacity>
              {/* <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => router.push('/auth/signup')}
              >
                <Text style={styles.secondaryButtonText}>{t.createAccount || 'Create Account'}</Text>
              </TouchableOpacity> */}
            </View>

            {/* Divider */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>{t.or || 'OR'}</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Google Login */}
            <TouchableOpacity style={styles.googleButton} onPress={handleGoogleLogin}>
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
    marginBottom: 12,
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
  },
  form: {
    flex: 1,
  },
  inputContainer: {
    marginBottom: 12,
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
  passwordInput: {
    borderColor: '#F43F5E',
  },
  inputIcon: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
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
  inputHelper: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 8,
  },
  errorText: {
    color: '#F43F5E',
  },
  rememberContainer: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'flex-start',
    alignItems: 'center',
    marginBottom: 12,
  },
  rememberContainerRTL: {
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
  rememberText: {
    fontSize: 16,
    color: '#1F2937',
  },
  notification: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#F43F5E',
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
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
  notificationButton: {
    backgroundColor: '#F43F5E',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
  },
  notificationButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
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
    marginVertical: 12,
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
  signUpLink: {
    alignItems: 'center',
    marginTop: 16,
  },
  signUpLinkText: {
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
