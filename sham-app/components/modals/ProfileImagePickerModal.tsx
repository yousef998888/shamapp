import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  Dimensions,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';

import { IconSymbol } from '@/components/ui/icon-symbol';
import * as ImagePicker from 'expo-image-picker';
import { Camera } from 'expo-camera';

interface ProfileImagePickerModalProps {
  visible: boolean;
  onClose: () => void;
  onImageSelected: (imageUri: string) => void;
  type: 'avatar' | 'background';
}

const { width: screenWidth } = Dimensions.get('window');

// Predefined pattern/background images
const PATTERN_IMAGES = [
  { id: 'pattern1', uri: 'https://images.unsplash.com/photo-1557683316-973673baf926?w=400&h=200&fit=crop', name: 'Geometric' },
  { id: 'pattern2', uri: 'https://images.unsplash.com/photo-1557683311-eac922144aa9?w=400&h=200&fit=crop', name: 'Abstract' },
  { id: 'pattern3', uri: 'https://images.unsplash.com/photo-1557683304-673a23048d34?w=400&h=200&fit=crop', name: 'Nature' },
  { id: 'pattern4', uri: 'https://images.unsplash.com/photo-1557683316-973673baf926?w=400&h=200&fit=crop', name: 'Minimal' },
  { id: 'pattern5', uri: 'https://images.unsplash.com/photo-1557683304-673a23048d34?w=400&h=200&fit=crop', name: 'Colorful' },
  { id: 'pattern6', uri: 'https://images.unsplash.com/photo-1557683311-eac922144aa9?w=400&h=200&fit=crop', name: 'Modern' },
];

export default function ProfileImagePickerModal({
  visible,
  onClose,
  onImageSelected,
  type,
}: ProfileImagePickerModalProps) {
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [showPhotoOptions, setShowPhotoOptions] = useState(false);

  // Request camera permission on mount
  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasCameraPermission(status === 'granted');
    })();
  }, []);

  const takePhoto = async () => {
    if (hasCameraPermission === false) {
      Alert.alert('Permission Required', 'Camera permission is required to take photos');
      return;
    }

    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: type === 'avatar' ? [1, 1] : [16, 9],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        onImageSelected(result.assets[0].uri);
        onClose();
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  const selectFromGallery = async () => {
    try {
      // Request gallery permission first
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Gallery permission is required to select photos');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: type === 'avatar' ? [1, 1] : [16, 9],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        onImageSelected(result.assets[0].uri);
        onClose();
      }
    } catch (error) {
      console.error('Error selecting images:', error);
      Alert.alert('Error', 'Failed to select images');
    }
  };

  const selectPattern = (patternUri: string) => {
    onImageSelected(patternUri);
    onClose();
  };

  const handleOptionPress = (option: string) => {
    setShowPhotoOptions(false);
    switch (option) {
      case 'camera':
        takePhoto();
        break;
      case 'gallery':
        selectFromGallery();
        break;
      case 'patterns':
        setShowPhotoOptions(true);
        break;
    }
  };

  const renderPatterns = () => (
    <View style={styles.patternsContainer}>
      <Text style={styles.sectionTitle}>Choose a Pattern</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.patternsScroll}>
        {PATTERN_IMAGES.map((pattern) => (
          <TouchableOpacity
            key={pattern.id}
            style={styles.patternItem}
            onPress={() => selectPattern(pattern.uri)}
          >
            <Image source={{ uri: pattern.uri }} style={styles.patternImage} />
            <Text style={styles.patternName}>{pattern.name}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <SafeAreaView style={styles.overlay}>
        <View style={styles.modalContainer}>
          <View style={styles.header}>
            <Text style={styles.title}>
              {type === 'avatar' ? 'Change Profile Picture' : 'Change Background'}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <IconSymbol name="xmark" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {showPhotoOptions ? (
              <>
                <TouchableOpacity
                  style={styles.backButton}
                  onPress={() => setShowPhotoOptions(false)}
                >
                  <IconSymbol name="chevron.left" size={20} color="#3B82F6" />
                  <Text style={styles.backText}>Back</Text>
                </TouchableOpacity>
                {renderPatterns()}
              </>
            ) : (
              <View style={styles.optionsContainer}>
                <TouchableOpacity
                  style={styles.optionButton}
                  onPress={() => handleOptionPress('camera')}
                >
                  <View style={styles.optionIcon}>
                    <IconSymbol name="camera.fill" size={32} color="#3B82F6" />
                  </View>
                  <Text style={styles.optionTitle}>Take Photo</Text>
                  <Text style={styles.optionSubtitle}>Use camera to take a new photo</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.optionButton}
                  onPress={() => handleOptionPress('gallery')}
                >
                  <View style={styles.optionIcon}>
                    <IconSymbol name="photo.fill" size={32} color="#3B82F6" />
                  </View>
                  <Text style={styles.optionTitle}>Photo Library</Text>
                  <Text style={styles.optionSubtitle}>Choose from your photos</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.optionButton}
                  onPress={() => handleOptionPress('patterns')}
                >
                  <View style={styles.optionIcon}>
                    <IconSymbol name="square.grid.3x3.fill" size={32} color="#3B82F6" />
                  </View>
                  <Text style={styles.optionTitle}>Patterns</Text>
                  <Text style={styles.optionSubtitle}>Choose from predefined patterns</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    minHeight: '50%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    marginBottom: 10,
  },
  backText: {
    fontSize: 16,
    color: '#3B82F6',
    marginLeft: 8,
  },
  optionsContainer: {
    paddingVertical: 20,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    marginBottom: 12,
  },
  optionIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  optionSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  patternsContainer: {
    paddingVertical: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
  },
  patternsScroll: {
    marginHorizontal: -20,
    paddingHorizontal: 20,
  },
  patternItem: {
    marginRight: 16,
    alignItems: 'center',
  },
  patternImage: {
    width: 120,
    height: 80,
    borderRadius: 8,
    marginBottom: 8,
  },
  patternName: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
});
