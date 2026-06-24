import React, { useCallback, useRef } from 'react';
import {
  Keyboard,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { UI } from '@/constants/theme';

interface ChatComposerProps {
  value: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  disabled?: boolean;
  placeholder?: string;
  onTypingStart?: () => void;
  onTypingStop?: () => void;
}

export function ChatComposer({
  value,
  onChangeText,
  onSend,
  disabled,
  placeholder = 'Write a message...',
  onTypingStart,
  onTypingStop,
}: ChatComposerProps) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleChangeText = useCallback(
    (text: string) => {
      onChangeText(text);

      if (text.trim().length > 0) {
        onTypingStart?.();
      }

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        onTypingStop?.();
      }, 1200);
    },
    [onChangeText, onTypingStart, onTypingStop],
  );

  const handleSend = useCallback(() => {
    if (disabled || value.trim().length === 0) {
      return;
    }
    onTypingStop?.();
    onSend();
    Keyboard.dismiss();
  }, [disabled, onSend, onTypingStop, value]);

  return (
    <View style={styles.container}>
      <View style={styles.inputWrapper}>
        <TextInput
          value={value}
          onChangeText={handleChangeText}
          placeholder={placeholder}
          placeholderTextColor="#9CA3AF"
          style={styles.input}
          multiline
          maxLength={2000}
          textAlignVertical="top"
          autoCorrect
        />
      </View>
      <TouchableOpacity
        style={[styles.sendButton, (disabled || value.trim().length === 0) && styles.sendButtonDisabled]}
        onPress={handleSend}
        disabled={disabled || value.trim().length === 0}
      >
        <Text style={styles.sendText}>Send</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    paddingTop: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E7EB',
  },
  inputWrapper: {
    borderRadius: UI.dimensions.borderRadius,
    borderWidth: UI.dimensions.borderWidth,
    borderColor: UI.colors.border,
    backgroundColor: UI.colors.backgroundLight,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 12,
  },
  input: {
    minHeight: UI.dimensions.inputHeight,
    maxHeight: 140,
    fontSize: 15,
    color: '#111827',
    lineHeight: 20,
  },
  sendButton: {
    alignSelf: 'flex-end',
    backgroundColor: '#4338CA',
    paddingHorizontal: 22,
    height: UI.dimensions.buttonHeight,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: UI.dimensions.borderRadius,
  },
  sendButtonDisabled: {
    backgroundColor: '#C7D2FE',
  },
  sendText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
});
