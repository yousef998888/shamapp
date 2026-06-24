import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
} from 'react-native';
import { IconSymbol } from '@/components/ui/icon-symbol';

interface ImagePreviewProps {
  images: string[];
  onAddMore: () => void;
  onRemoveImage: (index: number) => void;
  maxImages?: number;
}

export default function ImagePreview({
  images,
  onAddMore,
  onRemoveImage,
  maxImages = 10,
}: ImagePreviewProps) {
  const canAddMore = images.length < maxImages;

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Photos *</Text>
      <Text style={styles.subtitle}>
        Add up to {maxImages} photos. First photo will be the cover image.
      </Text>
      
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.scrollContainer}
      >
        <View style={styles.imageList}>
          {images.map((imageUri, index) => (
            <View key={`${imageUri}-${index}`} style={styles.imageWrapper}>
              <Image source={{ uri: imageUri }} style={styles.image} />
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => onRemoveImage(index)}
              >
                <IconSymbol name="xmark.circle.fill" size={20} color="#EF4444" />
              </TouchableOpacity>
              {index === 0 && (
                <View style={styles.coverBadge}>
                  <Text style={styles.coverText}>Cover</Text>
                </View>
              )}
            </View>
          ))}
          
          {canAddMore && (
            <TouchableOpacity style={styles.addButton} onPress={onAddMore}>
              <IconSymbol name="plus" size={24} color="#61d5b6" />
              <Text style={styles.addButtonText}>Add Photo</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 12,
  },
  scrollContainer: {
    marginHorizontal: -20,
    paddingHorizontal: 20,
  },
  imageList: {
    flexDirection: 'row',
    gap: 12,
  },
  imageWrapper: {
    position: 'relative',
  },
  image: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  removeButton: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#fff',
    borderRadius: 10,
  },
  coverBadge: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    backgroundColor: '#61d5b6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  coverText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '500',
  },
  addButton: {
    width: 80,
    height: 80,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  addButtonText: {
    fontSize: 10,
    color: '#61d5b6',
    marginTop: 4,
    textAlign: 'center',
  },
});
