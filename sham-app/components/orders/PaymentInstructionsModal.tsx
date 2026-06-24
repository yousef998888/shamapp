import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';

interface PaymentInstructionsModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (paymentId: string, receiptUri: string | null) => Promise<void>;
  submitting?: boolean;
  defaultPaymentId?: string | null;
  totalAmount?: number | null;
  currency?: string | null;
}

const shamCashAccountNumber = '1234567890';

const formatCurrency = (value?: number | null, currency?: string | null) => {
  if (value == null) {
    return '—';
  }

  try {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: currency || 'GBP',
      minimumFractionDigits: 2,
    }).format(value);
  } catch {
    return `£${value.toFixed(2)}`;
  }
};

const PaymentInstructionsModal: React.FC<PaymentInstructionsModalProps> = ({
  visible,
  onClose,
  onSubmit,
  submitting = false,
  defaultPaymentId,
  totalAmount,
  currency,
}) => {
  const [paymentId, setPaymentId] = useState(defaultPaymentId || '');
  const [receiptUri, setReceiptUri] = useState<string | null>(null);
  const [receiptFileName, setReceiptFileName] = useState<string | null>(null);
  const [showFilePickerModal, setShowFilePickerModal] = useState(false);
  const [isPickingFile, setIsPickingFile] = useState(false);

  useEffect(() => {
    if (visible) {
      setPaymentId(defaultPaymentId || '');
      setReceiptUri(null);
      setReceiptFileName(null);
      setShowFilePickerModal(false);
      setIsPickingFile(false);
    }
  }, [defaultPaymentId, visible]);

  const formattedAmount = useMemo(
    () => formatCurrency(totalAmount, currency),
    [currency, totalAmount]
  );


  const notes = useMemo(
    () => [
      'Send exactly the amount shown above',
      'Your item will be held for 24 hours while payment is processed',
      'An admin will verify your payment proof',
      'The seller will be notified once payment is confirmed',
    ],
    []
  );

  const handleSelectPhoto = async () => {
    if (isPickingFile) return;
    
    setIsPickingFile(true);
    setShowFilePickerModal(false);
    
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Gallery permission is required to select receipt');
        setIsPickingFile(false);
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        setReceiptUri(result.assets[0].uri);
        setReceiptFileName(result.assets[0].fileName || `receipt.${result.assets[0].uri.split('.').pop()}`);
      }
      // If canceled, do nothing - user can tap Browse File again to reopen selection modal
    } catch (error) {
      console.error('Error selecting photo:', error);
      Alert.alert('Error', 'Failed to select photo. Please try again.');
    } finally {
      setIsPickingFile(false);
    }
  };

  const handleSelectFile = async () => {
    if (isPickingFile) return;
    
    setIsPickingFile(true);
    setShowFilePickerModal(false);
    
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        setReceiptUri(result.assets[0].uri);
        setReceiptFileName(result.assets[0].name);
      }
      // If canceled, do nothing - user can tap Browse File again to reopen selection modal
    } catch (error: any) {
      // Ignore cancellation errors - user can try again
      if (error?.code !== 'DOCUMENT_PICKER_CANCELED' && error?.message !== 'User canceled document picker') {
        console.error('Error selecting file:', error);
        Alert.alert('Error', 'Failed to select file. Please try again.');
      }
    } finally {
      setIsPickingFile(false);
    }
  };

  const handleRemoveReceipt = () => {
    setReceiptUri(null);
    setReceiptFileName(null);
  };

  const openFilePicker = () => {
    if (isPickingFile) return;
    setShowFilePickerModal(true);
  };

  const handleSubmit = async () => {
    if (!paymentId.trim()) {
      Alert.alert('Payment ID required', 'Enter the Sham Cash payment ID to continue.');
      return;
    }

    if (!receiptUri) {
      Alert.alert('Receipt required', 'Please upload your Sham Cash receipt or image as proof.');
      return;
    }

    await onSubmit(paymentId.trim(), receiptUri);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Submit Payment Proof</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton} accessibilityRole="button">
            <MaterialCommunityIcons name="close" size={22} color="#0F172A" />
          </TouchableOpacity>
        </View>

          <ScrollView
            style={styles.content}
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Use Sham Cash to pay</Text>
              <Text style={styles.paymentInstruction}>
                Please use Sham Cash to complete your payment and upload your receipt below.
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Sham Cash Account Number</Text>
              <View style={styles.accountBox}>
                <Text style={styles.accountNumber}>{shamCashAccountNumber}</Text>
                <Text style={styles.accountHint}>Use this account when sending the transfer</Text>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Amount</Text>
              <Text style={styles.sectionValue}>{formattedAmount}</Text>
            </View>

            <View style={styles.warningBox}>
              <MaterialCommunityIcons name="alert-circle-outline" size={20} color="#B45309" />
              <View style={styles.warningContent}>
                <Text style={styles.warningTitle}>Important notes</Text>
                {notes.map((note, index) => (
                  <Text key={index} style={styles.warningItem}>• {note}</Text>
                ))}
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Payment ID</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  placeholder="Enter your payment id."
                  autoCapitalize="characters"
                  value={paymentId}
                  onChangeText={setPaymentId}
                />
                <TouchableOpacity style={styles.helpButton} accessibilityLabel="Help">
                  <MaterialCommunityIcons name="help-circle-outline" size={20} color="#64748B" />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Receipt</Text>
              {receiptUri ? (
                <View style={styles.receiptPreview}>
                  {receiptFileName?.toLowerCase().endsWith('.pdf') ? (
                    <View style={styles.pdfPreview}>
                      <MaterialCommunityIcons name="file-pdf-box" size={64} color="#EF4444" />
                      <Text style={styles.pdfFileName} numberOfLines={2}>
                        {receiptFileName}
                      </Text>
                    </View>
                  ) : (
                    <Image source={{ uri: receiptUri }} style={styles.receiptImage} />
                  )}
                  <TouchableOpacity
                    style={styles.removeReceiptButton}
                    onPress={handleRemoveReceipt}
                  >
                    <MaterialCommunityIcons name="close-circle" size={24} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={[styles.uploadArea, isPickingFile && styles.uploadAreaDisabled]}
                  onPress={openFilePicker}
                  disabled={isPickingFile}
                >
                  {isPickingFile ? (
                    <ActivityIndicator size="large" color="#61d5b6" />
                  ) : (
                    <>
                      <MaterialCommunityIcons name="file-upload-outline" size={48} color="#61d5b6" />
                      <Text style={styles.uploadText}>Browse your file to upload!</Text>
                      <Text style={styles.uploadHint}>Supported Format: JPG or PDF</Text>
                      <View style={styles.browseButton}>
                        <MaterialCommunityIcons name="arrow-up" size={20} color="#FFFFFF" />
                        <Text style={styles.browseButtonText}>Browse File</Text>
                      </View>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.footerButtonSecondary} onPress={onClose}>
            <Text style={styles.footerButtonSecondaryText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.footerButtonPrimary,
              (submitting || !paymentId.trim() || !receiptUri) && styles.footerButtonPrimaryDisabled,
            ]}
            onPress={handleSubmit}
            disabled={submitting || !paymentId.trim() || !receiptUri}
          >
            {submitting ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.footerButtonPrimaryText}>Submit Payment Proof</Text>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* File Picker Selection Modal */}
      <Modal
        visible={showFilePickerModal && !isPickingFile}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!isPickingFile) {
            setShowFilePickerModal(false);
          }
        }}
      >
        <TouchableOpacity
          style={styles.filePickerOverlay}
          activeOpacity={1}
          onPress={() => {
            if (!isPickingFile) {
              setShowFilePickerModal(false);
            }
          }}
        >
          <View style={styles.filePickerModal} onStartShouldSetResponder={() => true}>
            <TouchableOpacity
              style={[styles.filePickerOption, isPickingFile && styles.filePickerOptionDisabled]}
              onPress={handleSelectPhoto}
              disabled={isPickingFile}
            >
              <MaterialCommunityIcons name="image-outline" size={24} color={isPickingFile ? "#CBD5E1" : "#61d5b6"} />
              <Text style={[styles.filePickerOptionText, isPickingFile && styles.filePickerOptionTextDisabled]}>
                Choose Photo
              </Text>
            </TouchableOpacity>
            <View style={styles.filePickerDivider} />
            <TouchableOpacity
              style={[styles.filePickerOption, isPickingFile && styles.filePickerOptionDisabled]}
              onPress={handleSelectFile}
              disabled={isPickingFile}
            >
              <MaterialCommunityIcons name="file-document-outline" size={24} color={isPickingFile ? "#CBD5E1" : "#61d5b6"} />
              <Text style={[styles.filePickerOptionText, isPickingFile && styles.filePickerOptionTextDisabled]}>
                Choose File
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
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
  closeButton: {
    padding: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    gap: 20,
  },
  section: {
    gap: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
  },
  sectionValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1D4ED8',
  },
  list: {
    gap: 12,
  },
  listItem: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  bullet: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E0E7FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bulletText: {
    fontWeight: '700',
    color: '#4338CA',
  },
  listItemText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    color: '#1E293B',
  },
  accountBox: {
    borderWidth: 1,
    borderColor: '#CBD5F5',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 18,
    backgroundColor: '#EEF2FF',
    gap: 6,
  },
  accountNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    letterSpacing: 1.2,
  },
  accountHint: {
    fontSize: 13,
    color: '#475569',
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: '#FEF3C7',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FBBF24',
  },
  warningContent: {
    flex: 1,
    gap: 6,
  },
  warningTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#92400E',
  },
  warningItem: {
    fontSize: 13,
    color: '#B45309',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingRight: 44,
    paddingVertical: 12,
    fontSize: 15,
    color: '#0F172A',
  },
  inputHint: {
    fontSize: 12,
    color: '#64748B',
  },
  inputContainer: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
  },
  helpButton: {
    position: 'absolute',
    right: 14,
    padding: 4,
  },
  paymentInstruction: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
  },
  uploadArea: {
    borderWidth: 2,
    borderColor: '#CBD5E1',
    borderStyle: 'dashed',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    minHeight: 200,
    gap: 12,
  },
  uploadAreaDisabled: {
    opacity: 0.6,
  },
  uploadText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#61d5b6',
    marginTop: 8,
  },
  uploadHint: {
    fontSize: 12,
    color: '#64748B',
  },
  browseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#61d5b6',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 8,
  },
  browseButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  receiptPreview: {
    position: 'relative',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  receiptImage: {
    width: '100%',
    height: 300,
    resizeMode: 'contain',
    backgroundColor: '#F8FAFC',
  },
  removeReceiptButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 4,
  },
  pdfPreview: {
    width: '100%',
    height: 300,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  pdfFileName: {
    fontSize: 14,
    color: '#475569',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  filePickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  filePickerModal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 8,
    width: '80%',
    maxWidth: 300,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  filePickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  filePickerDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 8,
  },
  filePickerOptionText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#0F172A',
  },
  filePickerOptionDisabled: {
    opacity: 0.6,
  },
  filePickerOptionTextDisabled: {
    color: '#CBD5E1',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  footerButtonSecondary: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerButtonSecondaryText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#475569',
  },
  footerButtonPrimary: {
    flex: 1,
    borderRadius: 16,
    backgroundColor: '#61d5b6',
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerButtonPrimaryDisabled: {
    backgroundColor: '#C4B5FD',
  },
  footerButtonPrimaryText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

export default PaymentInstructionsModal;
