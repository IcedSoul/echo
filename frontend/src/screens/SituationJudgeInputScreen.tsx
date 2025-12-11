/**
 * 情况评理输入页面
 * 用户描述事情经过，AI 从客观角度进行结构化分析
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
import { RootStackParamList } from '../types';
import { showWarning, showError, showSuccess } from '../utils/toast';
import { getCurrentUserId } from '../utils/storage';
import { uploadChatScreenshots, ImageAsset } from '../api/ocr';
import { useVoiceInput } from '../hooks/useVoiceInput';

type NavigationProp = StackNavigationProp<RootStackParamList, 'SituationJudgeInput'>;

interface Props {
  navigation: NavigationProp;
}

// 输入模式
type InputMode = 'text' | 'image';

// 示例内容
const exampleSituation = `我和男朋友昨天吵架了。我们约好周六一起去看他父母，结果周五晚上他突然说公司有紧急项目要加班，去不了了。

我很生气，因为这已经是第三次临时取消了。我说他总是把工作放在第一位，根本不重视我们的关系。他反驳说工作是没办法的事，我应该理解他。

我说如果真的重视，至少应该提前说，而不是前一天晚上才通知。他说他也是刚知道的，而且加班也是为了我们的未来。

最后他说我太作了，我说他根本不在乎我的感受，然后我就挂了电话。`;

const exampleBackground = `我们在一起两年了，他工作很忙，经常加班。最近三个月，原定的约会被取消了5次。`;

export const SituationJudgeInputScreen: React.FC<Props> = ({ navigation }) => {
  const { theme } = useTheme();
  const user = useAppSelector((state) => state.auth.user);

  const [inputMode, setInputMode] = useState<InputMode>('text');
  const [situation, setSituation] = useState('');
  const [background, setBackground] = useState('');
  const [showExampleModal, setShowExampleModal] = useState(false);
  
  // 图片上传相关状态
  const [selectedImages, setSelectedImages] = useState<ImageAsset[]>([]);
  const [isProcessingOCR, setIsProcessingOCR] = useState(false);

  // 语音输入
  const handleVoiceText = useCallback((text: string) => {
    setSituation(prev => prev ? `${prev}\n${text}` : text);
  }, []);

  const {
    isRecording,
    isProcessing: isVoiceProcessing,
    startRecording,
    stopRecording,
    cancelRecording,
    recordingDuration,
  } = useVoiceInput({ onTextRecognized: handleVoiceText });

  const situationLength = situation.length;
  const isValid = situationLength >= 20 && situationLength <= 5000;
  const hasImages = selectedImages.length > 0;

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
      showWarning({ title: '提示', message: '请先选择聊天截图' });
      return;
    }

    setIsProcessingOCR(true);
    try {
      const result = await uploadChatScreenshots(selectedImages);
      
      if (result.success && result.conversation_text) {
        setSituation(result.conversation_text);
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
      showWarning({ title: '提示', message: '请输入至少 20 字的事情经过' });
      return;
    }

    const userId = user?.userId || await getCurrentUserId();

    navigation.navigate('SituationJudgeLoading', {
      situation,
      background: background || undefined,
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
                inputMode === 'text' && { backgroundColor: 'rgba(59, 130, 246, 0.1)' },
              ]}
              onPress={() => setInputMode('text')}
              activeOpacity={0.7}
            >
              <Ionicons
                name="document-text-outline"
                size={18}
                color={inputMode === 'text' ? '#3B82F6' : theme.colors.textSecondary}
              />
              <Text
                style={[
                  styles.modeToggleText,
                  { color: inputMode === 'text' ? '#3B82F6' : theme.colors.textSecondary },
                ]}
              >
                输入文字
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.modeToggleButton,
                inputMode === 'image' && { backgroundColor: 'rgba(59, 130, 246, 0.1)' },
              ]}
              onPress={() => setInputMode('image')}
              activeOpacity={0.7}
            >
              <Ionicons
                name="images-outline"
                size={18}
                color={inputMode === 'image' ? '#3B82F6' : theme.colors.textSecondary}
              />
              <Text
                style={[
                  styles.modeToggleText,
                  { color: inputMode === 'image' ? '#3B82F6' : theme.colors.textSecondary },
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
                  事情经过 <Text style={{ color: theme.colors.danger }}>*</Text>
                </Text>
                <TouchableOpacity
                  style={[styles.exampleButton, { backgroundColor: 'rgba(59, 130, 246, 0.1)' }]}
                  onPress={() => setShowExampleModal(true)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="bulb-outline" size={14} color="#3B82F6" />
                  <Text style={[styles.exampleButtonText, { color: '#3B82F6' }]}>
                    查看示例
                  </Text>
                </TouchableOpacity>
              </View>
              <View style={[styles.textAreaContainer, { backgroundColor: theme.colors.surface }]}>
                <TextInput
                  style={[styles.textArea, { color: theme.colors.textPrimary }]}
                  multiline
                  numberOfLines={10}
                  placeholder="详细描述发生了什么，包括时间、地点、人物、事件的起因经过结果..."
                  placeholderTextColor={theme.colors.textTertiary}
                  value={situation}
                  onChangeText={setSituation}
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
                  {situationLength}/5000 字（至少20字）
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
                    <ActivityIndicator size="small" color="#3B82F6" />
                    <Text style={[styles.processingText, { color: theme.colors.textSecondary }]}>
                      正在识别...
                    </Text>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={[styles.voiceButton, { backgroundColor: 'rgba(59, 130, 246, 0.1)' }]}
                    onPress={startRecording}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="mic-outline" size={20} color="#3B82F6" />
                    <Text style={[styles.voiceButtonText, { color: '#3B82F6' }]}>
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
                上传相关截图，系统会自动识别文字内容
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
                  color={selectedImages.length >= 10 ? theme.colors.textTertiary : '#3B82F6'}
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
                    { backgroundColor: '#3B82F6' },
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

          {/* Background Input */}
          <View style={styles.inputSection}>
            <Text style={[styles.label, { color: theme.colors.textMuted }]}>
              补充背景（可选）
            </Text>
            <View style={[styles.backgroundContainer, { backgroundColor: theme.colors.surface }]}>
              <TextInput
                style={[styles.backgroundInput, { color: theme.colors.textPrimary }]}
                multiline
                numberOfLines={3}
                placeholder="补充一些背景信息，比如你们的关系、之前发生过什么..."
                placeholderTextColor={theme.colors.textTertiary}
                value={background}
                onChangeText={setBackground}
                maxLength={300}
                textAlignVertical="top"
              />
            </View>
          </View>

          {/* Tips */}
          <View style={[styles.tipsCard, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.tipsTitle, { color: theme.colors.textPrimary }]}>
              💡 描述建议
            </Text>
            <View style={styles.tipsList}>
              <View style={styles.tipItem}>
                <View style={[styles.tipDot, { backgroundColor: '#3B82F6' }]} />
                <Text style={[styles.tipText, { color: theme.colors.textSecondary }]}>
                  尽量客观描述事实，而不只是你的感受
                </Text>
              </View>
              <View style={styles.tipItem}>
                <View style={[styles.tipDot, { backgroundColor: '#3B82F6' }]} />
                <Text style={[styles.tipText, { color: theme.colors.textSecondary }]}>
                  包含对方说了什么、做了什么
                </Text>
              </View>
              <View style={styles.tipItem}>
                <View style={[styles.tipDot, { backgroundColor: '#3B82F6' }]} />
                <Text style={[styles.tipText, { color: theme.colors.textSecondary }]}>
                  说明事情发生的背景和时间顺序
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>

        {/* Bottom Action */}
        <View style={[styles.bottomAction, { backgroundColor: theme.colors.background }]}>
          <View style={styles.privacyRow}>
            <Ionicons name="shield-checkmark-outline" size={14} color={theme.colors.textTertiary} />
            <Text style={[styles.privacyText, { color: theme.colors.textTertiary }]}>
              不会存储原始内容
            </Text>
          </View>
          <TouchableOpacity
            onPress={handleSubmit}
            activeOpacity={0.8}
            disabled={!isValid}
            style={styles.gradientButtonWrapper}
          >
            <LinearGradient
              colors={
                isValid
                  ? ['#3B82F6', '#06B6D4']
                  : [theme.colors.border, theme.colors.border]
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.gradientButton}
            >
              <Ionicons
                name="analytics-outline"
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
                开始评理分析
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
                ⚖️ 评理示例
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
                事情经过示例：
              </Text>
              <View style={[styles.exampleBox, { backgroundColor: theme.colors.background }]}>
                <Text style={[styles.exampleText, { color: theme.colors.textPrimary }]}>
                  {exampleSituation}
                </Text>
              </View>
              
              <Text style={[styles.contextLabel, { color: theme.colors.textSecondary }]}>
                补充背景示例：
              </Text>
              <View style={[styles.contextBox, { backgroundColor: theme.colors.background }]}>
                <Text style={[styles.contextExampleText, { color: theme.colors.textPrimary }]}>
                  {exampleBackground}
                </Text>
              </View>
            </ScrollView>
            
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.useExampleButton, { backgroundColor: 'rgba(59, 130, 246, 0.1)' }]}
                onPress={() => {
                  setSituation(exampleSituation);
                  setBackground(exampleBackground);
                  setShowExampleModal(false);
                }}
                activeOpacity={0.8}
              >
                <Text style={[styles.useExampleText, { color: '#3B82F6' }]}>
                  使用此示例
                </Text>
              </TouchableOpacity>
            </View>
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
    borderColor: 'rgba(59, 130, 246, 0.1)',
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
    minHeight: 200,
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
  backgroundContainer: {
    borderRadius: 10,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  backgroundInput: {
    fontSize: 14,
    lineHeight: 22,
    minHeight: 72,
  },
  tipsCard: {
    borderRadius: 10,
    padding: 16,
    marginTop: 8,
  },
  tipsTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  tipsList: {
    gap: 8,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  tipDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 7,
  },
  tipText: {
    fontSize: 13,
    lineHeight: 18,
    flex: 1,
  },
  bottomAction: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 32,
  },
  privacyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 12,
  },
  privacyText: {
    fontSize: 12,
  },
  gradientButtonWrapper: {
    borderRadius: 10,
    overflow: 'hidden',
    shadowColor: '#3B82F6',
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
    maxHeight: '80%',
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
  },
  modalSubtitle: {
    fontSize: 13,
    marginBottom: 10,
  },
  exampleBox: {
    borderRadius: 10,
    padding: 14,
    marginBottom: 16,
  },
  exampleText: {
    fontSize: 13,
    lineHeight: 20,
  },
  contextLabel: {
    fontSize: 13,
    marginBottom: 10,
  },
  contextBox: {
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
  },
  contextExampleText: {
    fontSize: 13,
    lineHeight: 20,
  },
  modalActions: {
    padding: 20,
  },
  useExampleButton: {
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  useExampleText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
