import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useAuthContext } from '../contexts/AuthContext';

export default function AuthExample() {
  const { 
    user, 
    profile, 
    loading, 
    isAuthenticated, 
    signUpWithEmail, 
    signInWithEmail, 
    signOut,
    signUpLoading,
    signInLoading,
    signUpError,
    signInError
  } = useAuthContext();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);

  const handleAuth = () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (isSignUp) {
      signUpWithEmail(email, password);
    } else {
      signInWithEmail(email, password);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text>Loading...</Text>
      </View>
    );
  }

  if (isAuthenticated && user) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Welcome!</Text>
        <Text>Email: {user.email}</Text>
        {profile && (
          <>
            <Text>Name: {profile.full_name || 'Not set'}</Text>
            <Text>Username: {profile.username || 'Not set'}</Text>
          </>
        )}
        <TouchableOpacity style={styles.button} onPress={signOut}>
          <Text style={styles.buttonText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        {isSignUp ? 'Sign Up' : 'Sign In'}
      </Text>
      
      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      
      <TextInput
        style={styles.input}
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      
      {signUpError && <Text style={styles.errorText}>{signUpError}</Text>}
      {signInError && <Text style={styles.errorText}>{signInError}</Text>}
      
      <TouchableOpacity 
        style={[styles.button, (signUpLoading || signInLoading) && styles.buttonDisabled]} 
        onPress={handleAuth}
        disabled={signUpLoading || signInLoading}
      >
        <Text style={styles.buttonText}>
          {signUpLoading || signInLoading ? 'Loading...' : (isSignUp ? 'Sign Up' : 'Sign In')}
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={styles.switchButton} 
        onPress={() => setIsSignUp(!isSignUp)}
      >
        <Text style={styles.switchButtonText}>
          {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  input: {
    width: '100%',
    height: 40,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    paddingHorizontal: 10,
    marginBottom: 10,
  },
  button: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 5,
    marginBottom: 10,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  switchButton: {
    marginTop: 10,
  },
  switchButtonText: {
    color: '#007AFF',
  },
  errorText: {
    color: 'red',
    marginBottom: 10,
  },
});
