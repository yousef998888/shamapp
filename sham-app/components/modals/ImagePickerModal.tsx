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

import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconSymbol } from '@/components/ui/icon-symbol';
import * as ImagePicker from 'expo-image-picker';
import { Camera } from 'expo-camera';

interface ImagePickerModalProps {
    visible: boolean;
    onClose: () => void;
    onImagesSelected: (images: string[]) => void;
    selectedImages: string[];
    maxImages?: number;
}

const { width: screenWidth } = Dimensions.get('window');
const imageSize = (screenWidth - 60) / 3; // 3 images per row with padding

export default function ImagePickerModal({
    visible,
    onClose,
    onImagesSelected,
    selectedImages,
    maxImages = 10,
}: ImagePickerModalProps) {
    const insets = useSafeAreaInsets();
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
            // Request permission again to ensure it's granted
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission Required', 'Camera permission is required to take photos');
                return;
            }

            const result = await ImagePicker.launchCameraAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: false, // Disable editing to prevent crop screen on Android and crashes on iOS
                quality: 0.8,
                exif: false, // Disable EXIF to avoid potential issues
            });

            if (!result.canceled && result.assets && result.assets.length > 0 && result.assets[0]) {
                const newImages = [...selectedImages, result.assets[0].uri];
                if (newImages.length <= maxImages) {
                    onImagesSelected(newImages);
                    setShowPhotoOptions(false);
                } else {
                    Alert.alert('Limit Reached', `You can only select up to ${maxImages} images`);
                }
            }
        } catch (error) {
            console.error('Error taking photo:', error);
            Alert.alert('Error', 'Failed to take photo. Please try again.');
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
                allowsMultipleSelection: true,
                quality: 0.8,
                selectionLimit: maxImages - selectedImages.length,
            });

            if (!result.canceled && result.assets && result.assets.length > 0) {
                const newImages = [...selectedImages, ...result.assets.map(asset => asset.uri)];
                if (newImages.length <= maxImages) {
                    onImagesSelected(newImages);
                    setShowPhotoOptions(false);
                } else {
                    Alert.alert('Limit Reached', `You can only select up to ${maxImages} images`);
                }
            } else {
                // User canceled, close the options modal
                setShowPhotoOptions(false);
            }
        } catch (error) {
            console.error('Error selecting images:', error);
            Alert.alert('Error', 'Failed to select images');
            setShowPhotoOptions(false);
        }
    };


    const handleDone = () => {
        onClose();
    };

    return (
        <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
            <SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
                {/* Header */}
                <View style={[styles.header, { paddingTop: insets.top }]}>
                    <TouchableOpacity onPress={onClose} style={styles.backButton}>
                        <IconSymbol name="chevron.left" size={24} color="#000" />
                    </TouchableOpacity>
                    <Text style={styles.title}>Add Photos</Text>
                    <TouchableOpacity onPress={handleDone} style={styles.doneButton}>
                        <Text style={styles.doneButtonText}>Done</Text>
                    </TouchableOpacity>
                </View>

                 {/* Images Preview */}
                 <View style={styles.selectedImagesContainer}>
                     <View style={styles.imagesGrid}>
                         {selectedImages.length < maxImages && (
                             <TouchableOpacity style={styles.addMoreButton} onPress={() => setShowPhotoOptions(true)}>
                                 <IconSymbol name="photo" size={32} color="#61d5b6" />
                                 <Text style={styles.addMoreText}>Add photos</Text>
                             </TouchableOpacity>
                         )}
                         {selectedImages.map((imageUri, index) => (
                             <View key={`selected-${imageUri}-${index}`} style={styles.selectedImageWrapper}>
                                 <Image source={{ uri: imageUri }} style={styles.selectedImage} />
                                 {index === 0 && (
                                     <View style={styles.mainBadge}>
                                         <Text style={styles.mainText}>Main</Text>
                                     </View>
                                 )}
                                 <TouchableOpacity
                                     style={styles.removeSelectedButton}
                                     onPress={() => onImagesSelected(selectedImages.filter((_, i) => i !== index))}
                                 >
                                     <IconSymbol name="ellipsis" size={16} color="#6B7280" />
                                 </TouchableOpacity>
                             </View>
                         ))}
                     </View>
                 </View>


                {/* Selection Counter */}
                {selectedImages.length > 0 && (
                    <View style={styles.selectionCounter}>
                        <IconSymbol name="photo" size={16} color="#61d5b6" />
                        <Text style={styles.counterText}>
                            {selectedImages.length} of {maxImages} items selected
                        </Text>
                    </View>
                )}

                {/* Photo Options Modal */}
                <Modal
                    visible={showPhotoOptions}
                    transparent={true}
                    animationType="fade"
                    onRequestClose={() => setShowPhotoOptions(false)}
                >
                    <View style={styles.photoOptionsOverlay}>
                        <View style={styles.photoOptionsModal}>
                            <TouchableOpacity
                                style={styles.photoOption}
                                onPress={() => {
                                    setShowPhotoOptions(false);
                                    // Small delay to ensure modal closes before opening camera
                                    setTimeout(() => {
                                        takePhoto();
                                    }, 300);
                                }}
                            >
                                <IconSymbol name="camera" size={24} color="#61d5b6" />
                                <Text style={styles.photoOptionText}>Take photos</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.photoOption}
                                onPress={() => {
                                    setShowPhotoOptions(false);
                                    // Small delay to ensure modal closes before opening gallery
                                    setTimeout(() => {
                                        selectFromGallery();
                                    }, 300);
                                }}
                            >
                                <IconSymbol name="photo" size={24} color="#61d5b6" />
                                <Text style={styles.photoOptionText}>Choose from gallery</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Modal>
            </SafeAreaView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    backButton: {
        padding: 8,
    },
    title: {
        fontSize: 18,
        fontWeight: '600',
        color: '#000',
    },
    doneButton: {
        padding: 8,
    },
    doneButtonText: {
        fontSize: 16,
        color: '#61d5b6',
        fontWeight: '600',
    },
     selectedImagesContainer: {
         paddingHorizontal: 20,
         paddingVertical: 16,
     },
     imagesGrid: {
         flexDirection: 'row',
         flexWrap: 'wrap',
         justifyContent: 'flex-start',
         gap: 12,
     },
     selectedImageWrapper: {
         position: 'relative',
         width: '30%', // 3 columns with gap
         aspectRatio: 1,
     },
     selectedImage: {
         width: '100%',
         height: '100%',
         borderRadius: 12,
         backgroundColor: '#F3F4F6',
     },
    mainBadge: {
        position: 'absolute',
        bottom: 8,
        left: 8,
        backgroundColor: '#6B7280',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    mainText: {
        fontSize: 12,
        color: '#fff',
        fontWeight: '500',
    },
    removeSelectedButton: {
        position: 'absolute',
        top: 8,
        right: 8,
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        justifyContent: 'center',
        alignItems: 'center',
    },
     addMoreButton: {
         width: '30%', // Match grid column width
         aspectRatio: 1,
         borderRadius: 12,
         borderWidth: 2,
         borderColor: '#E5E7EB',
         borderStyle: 'dashed',
         justifyContent: 'center',
         alignItems: 'center',
         backgroundColor: '#F8FAFC',
     },
    addMoreText: {
        fontSize: 12,
        color: '#61d5b6',
        marginTop: 4,
        textAlign: 'center',
    },
    selectionCounter: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        paddingHorizontal: 20,
        backgroundColor: '#F8FAFC',
        gap: 8,
    },
    counterText: {
        fontSize: 14,
        color: '#6B7280',
    },
    photoOptionsOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    photoOptionsModal: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 20,
        marginHorizontal: 40,
        minWidth: 200,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.25,
        shadowRadius: 8,
        elevation: 8,
    },
    photoOption: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 20,
        gap: 12,
    },
    photoOptionText: {
        fontSize: 16,
        color: '#000',
        fontWeight: '500',
    },
});
