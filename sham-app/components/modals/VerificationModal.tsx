import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CameraType, CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useUserVerification } from '@/hooks/useUserVerification';
import { usePageTranslation } from '@/hooks/useTranslation';
import { useAuthContext } from '@/contexts/AuthContext';

interface VerificationModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmitted?: () => void;
}

export default function VerificationModal({ visible, onClose, onSubmitted }: VerificationModalProps) {
  const { t } = usePageTranslation('accountPage');
  const { isAuthenticated, user } = useAuthContext();
  const cameraRef = useRef<CameraView | null>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>('back');
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [isRequestingPermission, setIsRequestingPermission] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const insets = useSafeAreaInsets();

  const { status, latestRequest, submit, submitLoading, refetch } = useUserVerification();

  // Close modal if user is not authenticated
  useEffect(() => {
    if (visible && !isAuthenticated) {
      Alert.alert(
        t.signInRequired || 'Sign in required',
        t.signInToVerify || 'Please sign in to verify your identity'
      );
      onClose();
    }
  }, [visible, isAuthenticated, onClose, t]);

  useEffect(() => {
    if (visible) {
      setPreviewUri(null);
      setIsProcessing(false);
    }
  }, [visible]);

  useEffect(() => {
    if (!visible) {
      return;
    }
    if (permission?.granted) {
      return;
    }
    setIsRequestingPermission(true);
    requestPermission().finally(() => setIsRequestingPermission(false));
  }, [permission?.granted, requestPermission, visible]);

  const handleCapture = useCallback(async () => {
    if (!cameraRef.current) {
      Alert.alert(t.captureFailed || 'Capture failed', t.captureFailedMessage || 'We could not capture the document. Please try again.');
      return;
    }

    try {
      setIsProcessing(true);
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
      });

      if (photo?.uri) {
        setPreviewUri(photo.uri);
      } else {
        Alert.alert(t.captureFailed || 'Capture failed', t.captureFailedMessage || 'We could not capture the document. Please try again.');
      }
    } catch (error) {
      console.error('Error capturing photo:', error);
      Alert.alert(
        t.captureFailed || 'Capture failed',
        error instanceof Error ? error.message : (t.captureFailedMessage || 'We could not capture the document. Please try again.')
      );
    } finally {
      setIsProcessing(false);
    }
  }, [t]);

  const handlePickFromLibrary = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.9,
    });
    if (!result.canceled && result.assets.length > 0) {
      setPreviewUri(result.assets[0].uri);
    }
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!previewUri) {
      Alert.alert(t.addYourId || 'Add your ID', t.captureIdFirst || 'Capture or upload a clear photo of your ID first.');
      return;
    }

    setIsProcessing(true);
    try {
      await submit({ fileUri: previewUri });
      await refetch();
      Alert.alert(
        t.verificationSubmitted || 'Verification submitted',
        t.verificationSubmittedMessage || 'Thank you! We will review your ID within 24 hours.',
        [{ text: t.close || 'Close', onPress: onClose }],
      );
      onSubmitted?.();
      setPreviewUri(null);
    } catch (error: any) {
      console.error('Verification submission failed', error);
      Alert.alert(t.submissionFailed || 'Submission failed', error?.message ?? (t.tryAgainLater || 'Please try again later.'));
    } finally {
      setIsProcessing(false);
    }
  }, [previewUri, submit, refetch, onSubmitted, onClose, t]);

  const statusBanner = useMemo(() => {
    if (status === 'approved') {
      return (
        <View style={[styles.statusBanner, styles.statusApproved]}>
          <Ionicons name="checkmark-circle" size={18} color="#047857" />
          <Text style={[styles.statusText, { color: '#047857' }]}>
            {t.accountVerified || 'Your account is verified. Thank you for keeping Sham safe!'}
          </Text>
        </View>
      );
    }
    if (status === 'pending') {
      return (
        <View style={[styles.statusBanner, styles.statusPending]}>
          <ActivityIndicator size="small" color="#b45309" />
          <Text style={[styles.statusText, { color: '#92400e' }]}>
            {t.verificationUnderReview || "Verification under review. We'll notify you once it's complete."}
          </Text>
        </View>
      );
    }
    if (status === 'rejected') {
      return (
        <View style={[styles.statusBanner, styles.statusRejected]}>
          <Ionicons name="alert-circle" size={18} color="#b91c1c" />
          <View style={{ flex: 1 }}>
            <Text style={[styles.statusText, { color: '#991b1b', fontWeight: '600' }]}>
              {t.verificationRejected || 'Verification was rejected. Please upload a clearer document.'}
            </Text>
            {latestRequest?.review_notes ? (
              <Text style={[styles.statusText, { color: '#991b1b', marginTop: 4 }]}>
                {latestRequest.review_notes}
              </Text>
            ) : null}
          </View>
        </View>
      );
    }
    return null;
  }, [latestRequest?.review_notes, status, t]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} presentationStyle="fullScreen">
      <View style={styles.container}>
        <LinearGradient
          colors={['#0f172a', '#1e293b']}
          style={[styles.header, { paddingTop: insets.top + 24 }]}
        >
          <TouchableOpacity 
            onPress={onClose} 
            style={[styles.closeButton]}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close" size={24} color="#e2e8f0" />
          </TouchableOpacity>
          <Text style={styles.title}>{t.verificationModalTitle || 'Verify your identity'}</Text>
          <Text style={styles.subtitle}>
            {t.verificationModalSubtitle || 'Place your government-issued ID inside the frame. Make sure the text is sharp and readable.'}
          </Text>
        </LinearGradient>

        <View style={styles.content}>
          {statusBanner}

          {/* Hide camera when status is pending or approved */}
          {status === 'pending' || status === 'approved' ? (
            <View style={styles.pendingContainer}>
              <Ionicons 
                name={status === 'approved' ? 'checkmark-circle' : 'time'} 
                size={64} 
                color={status === 'approved' ? '#10b981' : '#f59e0b'} 
              />
              <Text style={styles.pendingTitle}>
                {status === 'approved' 
                  ? (t.alreadyVerified || 'Already Verified')
                  : (t.verificationPending || 'Verification Pending')}
              </Text>
              <Text style={styles.pendingMessage}>
                {status === 'approved'
                  ? (t.alreadyVerifiedMessage || 'Your account has already been verified.')
                  : (t.pendingMessage || 'You already have a verification request under review. Please wait for it to be processed.')}
              </Text>
              <TouchableOpacity
                style={[styles.actionButton, styles.primaryButton, { marginTop: 24, width: '100%' }]}
                onPress={onClose}
              >
                <Ionicons name="close-circle" size={18} color="#0f172a" />
                <Text style={styles.primaryButtonLabel}>{t.close || 'Close'}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <View style={styles.cameraWrapper}>
                {previewUri ? (
                  <Image source={{ uri: previewUri }} style={styles.previewImage} />
                ) : permission?.granted ? (
                  <>
                    <CameraView
                      style={styles.camera}
                      facing={facing}
                      ref={(ref) => {
                        cameraRef.current = ref;
                      }}
                      ratio="4:3"
                    />
                    <View style={styles.overlay} pointerEvents="none">
                      <View style={styles.overlayShade} />
                      <View style={styles.overlayCenter}>
                        <View style={styles.cardFrameBorder} />
                        <Text style={styles.overlayInstruction}>{t.alignYourId || 'Align your ID within the frame'}</Text>
                      </View>
                      <View style={styles.overlayShade} />
                    </View>
                  </>
                ) : isRequestingPermission ? (
                  <View style={styles.permissionContainer}>
                    <ActivityIndicator size="small" color="#475569" />
                    <Text style={styles.permissionText}>{t.requestingCameraAccess || 'Requesting camera access…'}</Text>
                  </View>
                ) : (
                  <View style={styles.permissionContainer}>
                    <Ionicons name="camera" size={28} color="#64748b" />
                    <Text style={styles.permissionText}>
                      {t.cameraAccessNeeded || 'We need access to your camera to capture your ID.'}
                    </Text>
                    <TouchableOpacity
                      style={styles.permissionButton}
                      onPress={() => requestPermission()}
                    >
                      <Text style={styles.permissionButtonText}>{t.allowCameraAccess || 'Allow camera access'}</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              <View style={styles.controls}>
                {previewUri ? (
                  <View style={styles.previewActions}>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.secondaryButton]}
                      onPress={() => setPreviewUri(null)}
                    >
                      <Ionicons name="refresh" size={18} color="#1f2937" />
                      <Text style={styles.secondaryButtonLabel}>{t.retake || 'Retake'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.primaryButton]}
                      onPress={handleSubmit}
                      disabled={isProcessing || submitLoading}
                    >
                      {isProcessing || submitLoading ? (
                        <ActivityIndicator size="small" color="#0f172a" />
                      ) : (
                        <Ionicons name="checkmark-circle" size={18} color="#0f172a" />
                      )}
                      <Text style={styles.primaryButtonLabel}>{t.submit || 'Submit'}</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.captureActions}>
                    <TouchableOpacity
                      style={[styles.captureButton, styles.secondaryCircle]}
                      onPress={() => setFacing((prev) => (prev === 'back' ? 'front' : 'back'))}
                    >
                      <Ionicons name="camera-reverse" size={20} color="#0f172a" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.shutterButtonOuter}
                      onPress={handleCapture}
                    >
                      <View style={styles.shutterButtonInner} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.captureButton, styles.secondaryCircle]}
                      onPress={handlePickFromLibrary}
                    >
                      <Ionicons name="images" size={20} color="#0f172a" />
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  header: {
    paddingTop: 48,
    paddingBottom: 24,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  closeButton: {
    position: 'absolute',
    top: 48,
    right: 24,
    padding: 8,
    height: 40,
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: 'rgba(226, 232, 240, 0.1)',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#f8fafc',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: '#cbd5f5',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 32,
    gap: 16,
  },
  statusBanner: {
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusApproved: {
    backgroundColor: '#ecfdf5',
  },
  statusPending: {
    backgroundColor: '#fffbeb',
  },
  statusRejected: {
    backgroundColor: '#fef2f2',
  },
  statusText: {
    fontSize: 13,
    flex: 1,
  },
  cameraWrapper: {
    flex: 1,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#020617',
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  camera: {
    flex: 1,
  },
  previewImage: {
    flex: 1,
    resizeMode: 'cover',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
  },
  overlayShade: {
    flex: 1,
    backgroundColor: 'rgba(2, 6, 23, 0.65)',
  },
  overlayCenter: {
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardFrameBorder: {
    width: '80%',
    height: 180,
    borderWidth: 3,
    borderColor: '#f8fafc',
    borderRadius: 24,
    backgroundColor: 'transparent',
  },
  overlayInstruction: {
    marginTop: 12,
    color: '#e2e8f0',
    fontSize: 13,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  controls: {
    gap: 16,
  },
  captureActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  captureButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e2e8f0',
  },
  secondaryCircle: {
    backgroundColor: '#cbd5f5',
  },
  shutterButtonOuter: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: '#e2e8f0',
  },
  shutterButtonInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#f8fafc',
  },
  previewActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    borderRadius: 14,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  primaryButton: {
    backgroundColor: '#f8fafc',
  },
  primaryButtonLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0f172a',
  },
  secondaryButton: {
    backgroundColor: '#e2e8f0',
  },
  secondaryButtonLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0f172a',
  },
  permissionContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 12,
    backgroundColor: '#020617',
  },
  permissionText: {
    color: '#cbd5f5',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  permissionButton: {
    backgroundColor: '#e2e8f0',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  permissionButtonText: {
    color: '#0f172a',
    fontWeight: '600',
  },
  pendingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    backgroundColor: '#020617',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  pendingTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#f8fafc',
    marginTop: 16,
    textAlign: 'center',
  },
  pendingMessage: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
});
