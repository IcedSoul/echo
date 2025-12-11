/**
 * 表达助手输入页面
 * 用户输入想说的话，选择目标意图，AI 帮助优化表达
 * 支持文字输入、截图上传、语音输入
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Modal,
  Pressable,
  Image,
  ActivityIndicator,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { useTheme } from '../contexts/ThemeContext';
import { useAppSelector } from '../store/hooks';
import { ScreenContainer } from '../components/ScreenContainer';
import { RootStackParamList, ExpressionIntent } from '../types';
import { showWarning, showError, showSuccess } from '../utils/toast';
import { getCurrentUserId } from '../utils/storage';
import { uploadChatScreenshots, ImageAsset } from '../api/ocr';
import { useVoiceInput } from '../hooks/useVoiceInput';

type NavigationProp = StackNavigationProp<RootStackParamList, 'ExpressionHelperInput'>;

interface Props {
  navigation: NavigationProp;
}

// 输入模式
type InputMode = 'text' | 'image';

interface IntentOption {
  value: ExpressionIntent;
  label: string;
  icon: string;
  gradientColors: [string, string];
}

const intentOptions: IntentOption[] = [
  {
    value: 'reconcile',
    label: '和解',
    icon: '🤝',
    gradientColors: ['#10B981', '#059669'],
  },
  {
    value: 'boundary',
    label: '设界限',
    icon: '🛡️',
    gradientColors: ['#F59E0B', '#D97706'],
  },
  {
    value: 'understand',
    label: '求理解',
    icon: '💙',
    gradientColors: ['#3B82F6', '#06B6D4'],
  },
  {
    value: 'stance',
    label: '表态',
    icon: '💬',
    gradientColors: ['#A855F7', '#EC4899'],
  },
];

// 示例内容
interface ExpressionExample {
  intent: ExpressionIntent;
  original: string;
  description: string;
}

const expressionExamples: ExpressionExample[] = [
  {
    intent: 'reconcile',
    original: '好吧算了，都是我的错行了吧，你满意了吗？',
    description: '和解 - 想缓和气氛但不知道怎么说',
  },
  {
    intent: 'boundary',
    original: '你怎么又这样啊，每次都这样，烦死了，我受不了了！',
    description: '设界限 - 想拒绝但不想伤感情',
  },
  {
    intent: 'understand',
    original: '你根本就不理解我！我累死了你知道吗？',
    description: '求理解 - 想表达感受希望被理解',
  },
  {
    intent: 'stance',
    original: '这件事我不同意，但是又不知道怎么说才好。',
    description: '表态 - 想表明立场但怕起冲突',
  },
];

export const ExpressionHelperInputScreen: React.FC<Props> = ({ navigation }) => {
  const { theme } = useTheme();
  const user = useAppSelector((state) => state.auth.user);

  const [inputMode, setInputMode] = useState<InputMode>('text');
  const [message, setMessage] = useState('');
  const [intent, setIntent] = useState<ExpressionIntent>('understand');
  const [showIntentDropdown, setShowIntentDropdown] = useState(false);
  const [showExampleModal, setShowExampleModal] = useState(false);

  // 图片上传相关状态
  const [selectedImages, setSelectedImages] = useState<ImageAsset[]>([]);
  const [isProcessingOCR, setIsProcessingOCR] = useState(false);

  // 语音输入
  const handleVoiceText = useCallback((text: string) => {
    setMessage(prev => prev ? `${prev}\n${text}` : text);
  }, []);

  const {
    isRecording,
    isProcessing: isVoiceProcessing,
    startRecording,
    stopRecording,
    cancelRecording,
    recordingDuration,
  } = useVoiceInput({ onTextRecognized: handleVoiceText });

  const messageLength = message.length;
  const isValid = messageLength >= 5 && messageLength <= 2000;
  const selectedIntent = intentOptions.find((i) => i.value === intent) || intentOptions[2];

  // 图片压缩处理
  const compressImage = async (uri: string): Promise<ImageAsset> => {
    const manipResult = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 1200 } }],
      { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
    );
    return {
      uri: manipResult.uri,
      type: 'image/jpeg',
      fileName: `screenshot_${Date.now()}.jpg`,
    };
  };

  // 选择图片
  const handlePickImages = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (!permissionResult.granted) {
        showWarning({ title: '权限提示', message: '需要访问相册权限才能选择图片' });
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        selectionLimit: 10,
        quality: 1,
      });

      if (!result.canceled && result.assets.length > 0) {
        const compressedImages = await Promise.all(
          result.assets.map(async (asset) => compressImage(asset.uri))
        );
        
        setSelectedImages((prev) => {
          const newImages = [...prev, ...compressedImages];
          return newImages.slice(0, 10);
        });
      }
    } catch (error) {
      console.error('选择图片失败:', error);
      showError({ title: '错误', message: '选择图片失败，请重试' });
    }
  };

  // 移除图片
  const handleRemoveImage = (index: number) => {
    setSelectedImages((prev) => prev.filter((_, i) => i !== index));
  };

  // 处理 OCR
  const handleOCR = async () => {
    if (selectedImages.length === 0) {
      showWarning({ title: '提示', message: '请先选择截图' });
      return;
    }

    setIsProcessingOCR(true);
    try {
      const result = await uploadChatScreenshots(selectedImages);
      
      if (result.success && result.conversation_text) {
        setMessage(result.conversation_text);
        setInputMode('text');
        showSuccess({ 
          title: '识别成功', 
          message: `已从 ${result.image_count} 张截图中提取内容` 
        });
      } else {
        showWarning({ 
          title: '识别结果', 
          message: result.message || '未能识别出有效内容' 
        });
      }
    } catch (error: any) {
      console.error('OCR 处理失败:', error);
      showError({ 
        title: 'OCR 失败', 
        message: error.message || '图片识别失败，请重试' 
      });
    } finally {
      setIsProcessingOCR(false);
    }
  };

  const handleSubmit = async () => {
    if (!isValid) {
      showWarning({ title: '提示', message: '请输入至少 5 字的内容' });
      return;
    }

    const userId = user?.userId || await getCurrentUserId();

    navigation.navigate('ExpressionHelperLoading', {
      message,
      intent,
      userId,
    });
  };

  // 格式化录音时长
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <ScreenContainer backgroundColor={theme.colors.background}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >

          {/* 输入模式切换 */}
          <View style={styles.modeToggleContainer}>
            <TouchableOpacity
              style={[
                styles.modeToggleButton,
                inputMode === 'text' && { backgroundColor: 'rgba(20, 184, 166, 0.1)' },
              ]}
              onPress={() => setInputMode('text')}
              activeOpacity={0.7}
            >
              <Ionicons
                name="document-text-outline"
                size={18}
                color={inputMode === 'text' ? '#14B8A6' : theme.colors.textSecondary}
              />
              <Text
                style={[
                  styles.modeToggleText,
                  { color: inputMode === 'text' ? '#14B8A6' : theme.colors.textSecondary },
                ]}
              >
                输入文字
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.modeToggleButton,
                inputMode === 'image' && { backgroundColor: 'rgba(20, 184, 166, 0.1)' },
              ]}
              onPress={() => setInputMode('image')}
              activeOpacity={0.7}
            >
              <Ionicons
                name="images-outline"
                size={18}
                color={inputMode === 'image' ? '#14B8A6' : theme.colors.textSecondary}
              />
              <Text
                style={[
                  styles.modeToggleText,
                  { color: inputMode === 'image' ? '#14B8A6' : theme.colors.textSecondary },
                ]}
              >
                上传截图
              </Text>
            </TouchableOpacity>
          </View>

          {/* 文本输入模式 */}
          {inputMode === 'text' && (
            <View style={styles.inputSection}>
              <View style={styles.labelRow}>
                <Text style={[styles.label, { color: theme.colors.textMuted }]}>
                  你想说什么 <Text style={{ color: theme.colors.danger }}>*</Text>
                </Text>
                <TouchableOpacity
                  style={[styles.exampleButton, { backgroundColor: 'rgba(20, 184, 166, 0.1)' }]}
                  onPress={() => setShowExampleModal(true)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="bulb-outline" size={14} color="#14B8A6" />
                  <Text style={[styles.exampleButtonText, { color: '#14B8A6' }]}>
                    查看示例
                  </Text>
                </TouchableOpacity>
              </View>
              <View style={[styles.textAreaContainer, { backgroundColor: theme.colors.surface }]}>
                <TextInput
                  style={[styles.textArea, { color: theme.colors.textPrimary }]}
                  multiline
                  numberOfLines={8}
                  placeholder="直接输入你想表达的内容，可以是原始的、情绪化的，不用担心措辞..."
                  placeholderTextColor={theme.colors.textTertiary}
                  value={message}
                  onChangeText={setMessage}
                  textAlignVertical="top"
                />
              </View>
              <View style={styles.textInfo}>
                <Text
                  style={[
                    styles.charCount,
                    { color: isValid ? theme.colors.textSecondary : theme.colors.danger },
                  ]}
                >
                  {messageLength}/2000 字（至少5字）
                </Text>
              </View>

              {/* 语音输入按钮 */}
              <View style={styles.voiceInputRow}>
                {isRecording ? (
                  <View style={styles.recordingContainer}>
                    <View style={[styles.recordingIndicator, { backgroundColor: theme.colors.danger }]}>
                      <View style={styles.recordingPulse} />
                    </View>
                    <Text style={[styles.recordingText, { color: theme.colors.textPrimary }]}>
                      录音中 {formatDuration(recordingDuration)}
                    </Text>
                    <TouchableOpacity
                      style={[styles.recordingButton, { backgroundColor: theme.colors.danger }]}
                      onPress={stopRecording}
                    >
                      <Ionicons name="stop" size={20} color="#FFF" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.cancelButton, { backgroundColor: theme.colors.surface }]}
                      onPress={cancelRecording}
                    >
                      <Ionicons name="close" size={18} color={theme.colors.textSecondary} />
                    </TouchableOpacity>
                  </View>
                ) : isVoiceProcessing ? (
                  <View style={styles.processingContainer}>
                    <ActivityIndicator size="small" color="#14B8A6" />
                    <Text style={[styles.processingText, { color: theme.colors.textSecondary }]}>
                      正在识别...
                    </Text>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={[styles.voiceButton, { backgroundColor: 'rgba(20, 184, 166, 0.1)' }]}
                    onPress={startRecording}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="mic-outline" size={20} color="#14B8A6" />
                    <Text style={[styles.voiceButtonText, { color: '#14B8A6' }]}>
                      语音输入
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}

          {/* 图片上传模式 */}
          {inputMode === 'image' && (
            <View style={styles.inputSection}>
              <Text style={[styles.label, { color: theme.colors.textMuted }]}>
                聊天截图
              </Text>
              <Text style={[styles.hint, { color: theme.colors.textTertiary }]}>
                上传包含你想说的话的截图，系统会自动识别
              </Text>
              
              {/* 已选择的图片预览 */}
              {selectedImages.length > 0 && (
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false}
                  style={styles.imagePreviewContainer}
                  contentContainerStyle={styles.imagePreviewContent}
                >
                  {selectedImages.map((image, index) => (
                    <View key={index} style={styles.imagePreviewItem}>
                      <Image source={{ uri: image.uri }} style={styles.imagePreview} />
                      <TouchableOpacity
                        style={[styles.removeImageButton, { backgroundColor: theme.colors.danger }]}
                        onPress={() => handleRemoveImage(index)}
                      >
                        <Ionicons name="close" size={14} color="#FFF" />
                      </TouchableOpacity>
                      <View style={[styles.imageIndex, { backgroundColor: theme.colors.surface }]}>
                        <Text style={[styles.imageIndexText, { color: theme.colors.textSecondary }]}>
                          {index + 1}
                        </Text>
                      </View>
                    </View>
                  ))}
                </ScrollView>
              )}
              
              {/* 添加图片按钮 */}
              <TouchableOpacity
                style={[styles.addImageButton, { backgroundColor: theme.colors.surface }]}
                onPress={handlePickImages}
                activeOpacity={0.7}
                disabled={selectedImages.length >= 10}
              >
                <Ionicons
                  name="add-circle-outline"
                  size={28}
                  color={selectedImages.length >= 10 ? theme.colors.textTertiary : '#14B8A6'}
                />
                <Text
                  style={[
                    styles.addImageText,
                    { color: selectedImages.length >= 10 ? theme.colors.textTertiary : theme.colors.textSecondary },
                  ]}
                >
                  {selectedImages.length === 0
                    ? '点击选择截图'
                    : selectedImages.length >= 10
                    ? '已达到最大数量'
                    : `继续添加 (${selectedImages.length}/10)`}
                </Text>
              </TouchableOpacity>

              {/* OCR 识别按钮 */}
              {selectedImages.length > 0 && (
                <TouchableOpacity
                  style={[
                    styles.ocrButton,
                    { backgroundColor: '#14B8A6' },
                    isProcessingOCR && { opacity: 0.7 },
                  ]}
                  onPress={handleOCR}
                  activeOpacity={0.8}
                  disabled={isProcessingOCR}
                >
                  {isProcessingOCR ? (
                    <>
                      <ActivityIndicator size="small" color="#FFF" />
                      <Text style={styles.ocrButtonText}>正在识别...</Text>
                    </>
                  ) : (
                    <>
                      <Ionicons name="scan-outline" size={20} color="#FFF" />
                      <Text style={styles.ocrButtonText}>识别文字</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Intent Selection */}
          <View style={styles.inputSection}>
            <Text style={[styles.label, { color: theme.colors.textMuted }]}>目标意图</Text>
            <TouchableOpacity
              style={[styles.intentSelector, { backgroundColor: theme.colors.surface }]}
              onPress={() => setShowIntentDropdown(!showIntentDropdown)}
              activeOpacity={0.7}
            >
              <View style={styles.intentSelectorContent}>
                <LinearGradient
                  colors={selectedIntent.gradientColors}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.intentIconBox}
                >
                  <Text style={styles.intentIcon}>{selectedIntent.icon}</Text>
                </LinearGradient>
                <Text style={[styles.intentLabel, { color: theme.colors.textPrimary }]}>
                  {selectedIntent.label}
                </Text>
              </View>
              <Ionicons
                name={showIntentDropdown ? 'chevron-up' : 'chevron-down'}
                size={18}
                color={theme.colors.textTertiary}
              />
            </TouchableOpacity>

            {/* Dropdown */}
            {showIntentDropdown && (
              <View style={[styles.dropdown, { backgroundColor: theme.colors.surface }]}>
                {intentOptions.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.dropdownItem,
                      { borderBottomColor: theme.colors.border },
                    ]}
                    onPress={() => {
                      setIntent(option.value);
                      setShowIntentDropdown(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <LinearGradient
                      colors={option.gradientColors}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.intentIconBox}
                    >
                      <Text style={styles.intentIcon}>{option.icon}</Text>
                    </LinearGradient>
                    <Text style={[styles.dropdownItemText, { color: theme.colors.textPrimary }]}>
                      {option.label}
                    </Text>
                    {option.value === intent && (
                      <Ionicons name="checkmark" size={18} color={theme.colors.primary} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Intent Descriptions */}
          <View style={[styles.intentDescCard, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.intentDescTitle, { color: theme.colors.textPrimary }]}>
              💡 意图说明
            </Text>
            <View style={styles.intentDescList}>
              <View style={styles.intentDescItem}>
                <Text style={styles.intentDescEmoji}>🤝</Text>
                <Text style={[styles.intentDescText, { color: theme.colors.textSecondary }]}>
                  <Text style={{ fontWeight: '500' }}>和解</Text> - 修复关系，表达歉意或接受对方
                </Text>
              </View>
              <View style={styles.intentDescItem}>
                <Text style={styles.intentDescEmoji}>🛡️</Text>
                <Text style={[styles.intentDescText, { color: theme.colors.textSecondary }]}>
                  <Text style={{ fontWeight: '500' }}>设界限</Text> - 明确底线，拒绝不合理要求
                </Text>
              </View>
              <View style={styles.intentDescItem}>
                <Text style={styles.intentDescEmoji}>💙</Text>
                <Text style={[styles.intentDescText, { color: theme.colors.textSecondary }]}>
                  <Text style={{ fontWeight: '500' }}>求理解</Text> - 表达感受，希望被理解
                </Text>
              </View>
              <View style={styles.intentDescItem}>
                <Text style={styles.intentDescEmoji}>💬</Text>
                <Text style={[styles.intentDescText, { color: theme.colors.textSecondary }]}>
                  <Text style={{ fontWeight: '500' }}>表态</Text> - 清晰表明立场和观点
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>

        {/* Bottom Action */}
        <View style={[styles.bottomAction, { backgroundColor: theme.colors.background }]}>
          <Text style={[styles.disclaimer, { color: theme.colors.textTertiary }]}>
            💡 AI 会保留你的核心意思，优化表达方式
          </Text>
          <TouchableOpacity
            onPress={handleSubmit}
            activeOpacity={0.8}
            disabled={!isValid}
            style={styles.gradientButtonWrapper}
          >
            <LinearGradient
              colors={
                isValid
                  ? ['#14B8A6', '#06B6D4']
                  : [theme.colors.border, theme.colors.border]
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.gradientButton}
            >
              <Ionicons
                name="sparkles-outline"
                size={18}
                color={isValid ? '#FFFFFF' : theme.colors.textTertiary}
                style={{ marginRight: 8 }}
              />
              <Text
                style={[
                  styles.gradientButtonText,
                  { color: isValid ? '#FFFFFF' : theme.colors.textTertiary },
                ]}
              >
                生成表达方式
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* 示例弹窗 */}
      <Modal
        visible={showExampleModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowExampleModal(false)}
      >
        <Pressable 
          style={styles.modalOverlay} 
          onPress={() => setShowExampleModal(false)}
        >
          <Pressable 
            style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.colors.textPrimary }]}>
                ✨ 表达示例
              </Text>
              <TouchableOpacity
                onPress={() => setShowExampleModal(false)}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={22} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              <Text style={[styles.modalSubtitle, { color: theme.colors.textSecondary }]}>
                选择一个示例来体验表达优化：
              </Text>
              
              {expressionExamples.map((example, index) => {
                const intentOption = intentOptions.find(i => i.value === example.intent);
                return (
                  <TouchableOpacity
                    key={index}
                    style={[styles.exampleCard, { backgroundColor: theme.colors.background }]}
                    onPress={() => {
                      setMessage(example.original);
                      setIntent(example.intent);
                      setShowExampleModal(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={styles.exampleCardHeader}>
                      <LinearGradient
                        colors={intentOption?.gradientColors || ['#3B82F6', '#06B6D4']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.exampleIntentIcon}
                      >
                        <Text style={styles.exampleIntentEmoji}>{intentOption?.icon}</Text>
                      </LinearGradient>
                      <Text style={[styles.exampleCardLabel, { color: theme.colors.textSecondary }]}>
                        {example.description}
                      </Text>
                    </View>
                    <Text style={[styles.exampleCardText, { color: theme.colors.textPrimary }]}>
                      "{example.original}"
                    </Text>
                    <View style={styles.exampleCardAction}>
                      <Text style={[styles.exampleCardActionText, { color: '#14B8A6' }]}>
                        使用此示例 →
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  descriptionCard: {
    borderRadius: 10,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(20, 184, 166, 0.1)',
  },
  descriptionText: {
    fontSize: 14,
    lineHeight: 22,
  },
  modeToggleContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 12,
  },
  modeToggleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 6,
  },
  modeToggleText: {
    fontSize: 14,
    fontWeight: '500',
  },
  inputSection: {
    marginBottom: 16,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  hint: {
    fontSize: 12,
    marginBottom: 12,
  },
  exampleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    gap: 4,
  },
  exampleButtonText: {
    fontSize: 12,
    fontWeight: '500',
  },
  textAreaContainer: {
    borderRadius: 10,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  textArea: {
    fontSize: 14,
    lineHeight: 22,
    minHeight: 160,
  },
  textInfo: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  charCount: {
    fontSize: 12,
  },
  // 语音输入样式
  voiceInputRow: {
    marginTop: 12,
  },
  voiceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
  },
  voiceButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  recordingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  recordingIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  recordingPulse: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  recordingText: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  recordingButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  processingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  processingText: {
    fontSize: 14,
  },
  // 图片上传样式
  imagePreviewContainer: {
    marginBottom: 12,
  },
  imagePreviewContent: {
    gap: 10,
    paddingVertical: 4,
  },
  imagePreviewItem: {
    position: 'relative',
    width: 80,
    height: 140,
  },
  imagePreview: {
    width: 80,
    height: 140,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  removeImageButton: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageIndex: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageIndexText: {
    fontSize: 11,
    fontWeight: '600',
  },
  addImageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#E0E0E0',
    gap: 8,
  },
  addImageText: {
    fontSize: 14,
  },
  ocrButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 10,
    marginTop: 12,
    gap: 8,
  },
  ocrButtonText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '600',
  },
  intentSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  intentSelectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  intentIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  intentIcon: {
    fontSize: 16,
  },
  intentLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  dropdown: {
    marginTop: 8,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    overflow: 'hidden',
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderBottomWidth: 1,
  },
  dropdownItemText: {
    flex: 1,
    fontSize: 14,
  },
  intentDescCard: {
    borderRadius: 10,
    padding: 16,
    marginTop: 8,
  },
  intentDescTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  intentDescList: {
    gap: 8,
  },
  intentDescItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  intentDescEmoji: {
    fontSize: 14,
  },
  intentDescText: {
    fontSize: 13,
    lineHeight: 18,
    flex: 1,
  },
  bottomAction: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 32,
  },
  disclaimer: {
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 12,
  },
  gradientButtonWrapper: {
    borderRadius: 10,
    overflow: 'hidden',
    shadowColor: '#14B8A6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  gradientButton: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  gradientButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  // 弹窗样式
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxHeight: '85%',
    borderRadius: 16,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  modalCloseButton: {
    padding: 4,
  },
  modalScroll: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  modalSubtitle: {
    fontSize: 13,
    marginBottom: 16,
  },
  exampleCard: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  exampleCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  exampleIntentIcon: {
    width: 28,
    height: 28,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exampleIntentEmoji: {
    fontSize: 14,
  },
  exampleCardLabel: {
    fontSize: 12,
    flex: 1,
  },
  exampleCardText: {
    fontSize: 13,
    lineHeight: 20,
    fontStyle: 'italic',
  },
  exampleCardAction: {
    marginTop: 10,
    alignItems: 'flex-end',
  },
  exampleCardActionText: {
    fontSize: 12,
    fontWeight: '500',
  },
});
