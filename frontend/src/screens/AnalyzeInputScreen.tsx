import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Modal,
  Pressable,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { useTheme } from '../contexts/ThemeContext';
import { useAppSelector } from '../store/hooks';
import { ScreenContainer } from '../components/ScreenContainer';
import { RootStackParamList } from '../types';
import { Ionicons } from '@expo/vector-icons';
import { showWarning, showError, showSuccess } from '../utils/toast';
import { getCurrentUserId } from '../utils/storage';
import { uploadChatScreenshots, ImageAsset } from '../api/ocr';
import { checkInputQuality, QualityCheckResult } from '../utils/inputQualityCheck';
import { useVoiceInput } from '../hooks/useVoiceInput';

type AnalyzeInputScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'AnalyzeInput'
>;

interface Props {
  navigation: AnalyzeInputScreenNavigationProp;
}

// 输入模式
type InputMode = 'text' | 'image';

export const AnalyzeInputScreen: React.FC<Props> = ({ navigation }) => {
  const { theme } = useTheme();
  const user = useAppSelector((state) => state.auth.user);

  const [inputMode, setInputMode] = useState<InputMode>('text');
  const [conversationText, setConversationText] = useState('');
  const [contextDescription, setContextDescription] = useState('');
  
  // 图片上传相关状态
  const [selectedImages, setSelectedImages] = useState<ImageAsset[]>([]);
  const [isProcessingOCR, setIsProcessingOCR] = useState(false);

  // 示例弹窗状态
  const [showExampleModal, setShowExampleModal] = useState(false);

  // 语音输入
  const handleVoiceText = useCallback((text: string) => {
    setConversationText(prev => prev ? `${prev}\n${text}` : text);
  }, []);

  const {
    isRecording,
    isProcessing: isVoiceProcessing,
    startRecording,
    stopRecording,
    cancelRecording,
    recordingDuration,
  } = useVoiceInput({ onTextRecognized: handleVoiceText });

  const textLength = conversationText.length;
  const isTextValid = textLength >= 10 && textLength <= 5000;
  const hasImages = selectedImages.length > 0;

  // 输入质量检测 - 仅在文本超过 20 字时进行检测
  const qualityCheck = useMemo<QualityCheckResult | null>(() => {
    if (conversationText.length < 20) return null;
    return checkInputQuality(conversationText);
  }, [conversationText]);

  // 是否显示质量警告
  const showQualityWarnings = qualityCheck && qualityCheck.issues.length > 0;

  // 图片压缩处理
  const compressImage = async (uri: string): Promise<ImageAsset> => {
    const manipResult = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 1200 } }], // 限制最大宽度为 1200px
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
      // 请求权限
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
        // 压缩图片
        const compressedImages = await Promise.all(
          result.assets.map(async (asset) => {
            return compressImage(asset.uri);
          })
        );
        
        setSelectedImages((prev) => {
          const newImages = [...prev, ...compressedImages];
          // 最多保留 10 张
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
        setConversationText(result.conversation_text);
        setInputMode('text'); // 切换到文本模式显示结果
        showSuccess({ 
          title: '识别成功', 
          message: `已从 ${result.image_count} 张截图中提取对话` 
        });
        
        // 如果识别到聊天对象名称，可以添加到背景说明
        if (result.chat_name && !contextDescription) {
          setContextDescription(`与${result.chat_name}的对话`);
        }
      } else {
        showWarning({ 
          title: '识别结果', 
          message: result.message || '未能识别出有效对话内容' 
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
    if (!isTextValid) {
      showWarning({ title: '提示', message: '请输入10-5000字的对话内容' });
      return;
    }

    // 获取当前用户 ID（登录用户或匿名用户的持久化 ID）
    const userId = user?.userId || await getCurrentUserId();

    // Navigate to Loading screen with analysis parameters
    navigation.navigate('Loading', {
      conversationText: conversationText,
      contextDescription: contextDescription || undefined,
      userId: userId,
    });
  };

  // 格式化录音时长
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const exampleText = `我：你今天怎么又加班到这么晚？饭都凉了。
对方：公司有个紧急项目，我也没办法啊。
我：你总是把工作放在第一位，家里的事你什么时候上过心？
对方：我工作还不是为了这个家？你怎么就不能理解我呢？
我：我理解你？那谁来理解我？我一个人带孩子、做家务，你知道有多累吗？
对方：行行行，都是我的错，我不该工作，我不该赚钱。
我：你这是什么态度？我跟你好好说话，你能不能别阴阳怪气的？
对方：我累了一天了，不想吵，你非要吵是吧？
我：算了，跟你说不清楚。`;

  return (
    <ScreenContainer backgroundColor={theme.colors.background}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
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
                inputMode === 'text' && { backgroundColor: theme.colors.primaryAlpha10 },
              ]}
              onPress={() => setInputMode('text')}
              activeOpacity={0.7}
            >
              <Ionicons
                name="document-text-outline"
                size={18}
                color={inputMode === 'text' ? theme.colors.primary : theme.colors.textSecondary}
              />
              <Text
                style={[
                  styles.modeToggleText,
                  { color: inputMode === 'text' ? theme.colors.primary : theme.colors.textSecondary },
                ]}
              >
                粘贴文字
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.modeToggleButton,
                inputMode === 'image' && { backgroundColor: theme.colors.primaryAlpha10 },
              ]}
              onPress={() => setInputMode('image')}
              activeOpacity={0.7}
            >
              <Ionicons
                name="images-outline"
                size={18}
                color={inputMode === 'image' ? theme.colors.primary : theme.colors.textSecondary}
              />
              <Text
                style={[
                  styles.modeToggleText,
                  { color: inputMode === 'image' ? theme.colors.primary : theme.colors.textSecondary },
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
                  对话记录
                </Text>
                <TouchableOpacity
                  style={[styles.exampleButton, { backgroundColor: theme.colors.primaryAlpha10 }]}
                  onPress={() => setShowExampleModal(true)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="bulb-outline" size={14} color={theme.colors.primary} />
                  <Text style={[styles.exampleButtonText, { color: theme.colors.primary }]}>
                    查看示例
                  </Text>
                </TouchableOpacity>
              </View>
              <View style={[styles.textAreaContainer, { backgroundColor: theme.colors.surface }]}>
                <TextInput
                  style={[
                    styles.textArea,
                    {
                      color: theme.colors.textPrimary,
                    },
                  ]}
                  multiline
                  numberOfLines={8}
                  placeholder="粘贴你们的聊天记录，我会帮你分析对话中的情绪、需求和沟通模式..."
                  placeholderTextColor={theme.colors.textTertiary}
                  value={conversationText}
                  onChangeText={setConversationText}
                  textAlignVertical="top"
                />
              </View>
              <View style={styles.textInfo}>
                <Text
                  style={[
                    styles.charCount,
                    {
                      color: isTextValid
                        ? theme.colors.textSecondary
                        : theme.colors.danger,
                    },
                  ]}
                >
                  {textLength}/5000 字（至少10字）
                </Text>
              </View>

              {/* 质量检测结果 */}
              {showQualityWarnings && (
                <View style={[styles.qualityBox, { backgroundColor: theme.colors.riskMediumBg }]}>
                  <View style={styles.qualityHeader}>
                    <Ionicons name="alert-circle-outline" size={16} color={theme.colors.riskMedium} />
                    <Text style={[styles.qualityTitle, { color: theme.colors.riskMedium }]}>
                      输入质量提示
                    </Text>
                  </View>
                  {qualityCheck?.issues.map((issue, index) => (
                    <View key={index} style={styles.qualityIssue}>
                      <Text style={[styles.qualityMessage, { color: theme.colors.textPrimary }]}>
                        • {issue.message}
                      </Text>
                      {issue.suggestion && (
                        <Text style={[styles.qualitySuggestion, { color: theme.colors.textSecondary }]}>
                          💡 {issue.suggestion}
                        </Text>
                      )}
                    </View>
                  ))}
                  {/* 统计信息 */}
                  {qualityCheck && (
                    <View style={[styles.qualityStats, { borderTopColor: theme.colors.border }]}>
                      <Text style={[styles.qualityStatsText, { color: theme.colors.textTertiary }]}>
                        识别到：{qualityCheck.stats.myMessages} 条"我"的消息，
                        {qualityCheck.stats.otherMessages} 条对方消息，
                        {qualityCheck.stats.turnCount} 次往返
                      </Text>
                    </View>
                  )}
                </View>
              )}

              {/* 质量良好提示 */}
              {qualityCheck && qualityCheck.issues.length === 0 && textLength >= 50 && (
                <View style={[styles.qualityGoodBox, { backgroundColor: theme.colors.riskSafeBg }]}>
                  <Ionicons name="checkmark-circle" size={16} color={theme.colors.success} />
                  <Text style={[styles.qualityGoodText, { color: theme.colors.success }]}>
                    对话格式良好，识别到 {qualityCheck.stats.turnCount} 次往返对话
                  </Text>
                </View>
              )}

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
                    <ActivityIndicator size="small" color={theme.colors.primary} />
                    <Text style={[styles.processingText, { color: theme.colors.textSecondary }]}>
                      正在识别...
                    </Text>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={[styles.voiceButton, { backgroundColor: theme.colors.primaryAlpha10 }]}
                    onPress={startRecording}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="mic-outline" size={20} color={theme.colors.primary} />
                    <Text style={[styles.voiceButtonText, { color: theme.colors.primary }]}>
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
                请按时间顺序选择微信聊天截图，最多10张
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
                  color={selectedImages.length >= 10 ? theme.colors.textTertiary : theme.colors.primary}
                />
                <Text
                  style={[
                    styles.addImageText,
                    { color: selectedImages.length >= 10 ? theme.colors.textTertiary : theme.colors.textSecondary },
                  ]}
                >
                  {selectedImages.length === 0
                    ? '点击选择聊天截图'
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
                    { backgroundColor: theme.colors.primary },
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

          {/* Optional Context Card */}
          <View style={styles.inputSection}>
            <Text style={[styles.label, { color: theme.colors.textMuted }]}>
              背景说明（可选）
            </Text>
            <View style={[styles.contextContainer, { backgroundColor: theme.colors.surface }]}>
              <TextInput
                style={[
                  styles.contextInput,
                  {
                    color: theme.colors.textPrimary,
                  },
                ]}
                multiline
                numberOfLines={2}
                placeholder="补充一些背景信息，能让分析更准确..."
                placeholderTextColor={theme.colors.textTertiary}
                value={contextDescription}
                onChangeText={setContextDescription}
                maxLength={200}
                textAlignVertical="top"
              />
            </View>
          </View>

        </ScrollView>

        {/* Bottom Action */}
        <View style={[styles.bottomAction, { backgroundColor: theme.colors.background }]}>
          {/* Disclaimer - 统一放在按钮上方 */}
          <Text style={[styles.disclaimer, { color: theme.colors.textTertiary }]}>
            💡 Wavecho 是基于AI的沟通辅助工具，不能替代专业心理咨询。
          </Text>
          <TouchableOpacity
            onPress={handleSubmit}
            activeOpacity={0.8}
            disabled={!isTextValid}
            style={styles.gradientButtonWrapper}
          >
            <LinearGradient
              colors={
                isTextValid
                  ? [theme.colors.primary, theme.colors.gradientEnd]
                  : [theme.colors.border, theme.colors.border]
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.gradientButton}
            >
              <Ionicons
                name="sparkles"
                size={18}
                color={isTextValid ? '#FFFFFF' : theme.colors.textTertiary}
                style={{ marginRight: 8 }}
              />
              <Text
                style={[
                  styles.gradientButtonText,
                  { color: isTextValid ? '#FFFFFF' : theme.colors.textTertiary },
                ]}
              >
                开始分析
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
                💬 对话示例
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
                情侣/夫妻沟通冲突示例：
              </Text>
              <View style={[styles.exampleBox, { backgroundColor: theme.colors.background }]}>
                <Text style={[styles.exampleText, { color: theme.colors.textPrimary }]}>
                  {exampleText}
                </Text>
              </View>
              
              <Text style={[styles.contextLabel, { color: theme.colors.textSecondary }]}>
                背景说明示例：
              </Text>
              <View style={[styles.contextBox, { backgroundColor: theme.colors.background }]}>
                <Text style={[styles.contextExampleText, { color: theme.colors.textPrimary }]}>
                  伴侣经常加班，今晚又很晚才回家，我一直在等他吃饭。
                </Text>
              </View>
            </ScrollView>
            
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.useExampleButton, { backgroundColor: theme.colors.primaryAlpha10 }]}
                onPress={() => {
                  setConversationText(exampleText);
                  setContextDescription('伴侣经常加班，今晚又很晚才回家，我一直在等他吃饭。');
                  setShowExampleModal(false);
                }}
                activeOpacity={0.8}
              >
                <Text style={[styles.useExampleText, { color: theme.colors.primary }]}>
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
    paddingTop: 20,
    paddingBottom: 8,
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
  hint: {
    fontSize: 12,
    marginBottom: 12,
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
    minHeight: 280,
  },
  textInfo: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  charCount: {
    fontSize: 12,
  },
  // 质量检测样式
  qualityBox: {
    marginTop: 12,
    padding: 14,
    borderRadius: 10,
  },
  qualityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  qualityTitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  qualityIssue: {
    marginBottom: 8,
  },
  qualityMessage: {
    fontSize: 13,
    lineHeight: 20,
  },
  qualitySuggestion: {
    fontSize: 12,
    lineHeight: 18,
    marginTop: 2,
    marginLeft: 12,
  },
  qualityStats: {
    marginTop: 8,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  qualityStatsText: {
    fontSize: 11,
  },
  qualityGoodBox: {
    marginTop: 12,
    padding: 12,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  qualityGoodText: {
    fontSize: 13,
    flex: 1,
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
  contextContainer: {
    borderRadius: 10,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  contextInput: {
    fontSize: 14,
    lineHeight: 22,
    minHeight: 56,
  },
  // 图片上传相关样式
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
  bottomAction: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 32,
  },
  gradientButtonWrapper: {
    borderRadius: 10,
    overflow: 'hidden',
    shadowColor: '#06B6D4',
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
  disclaimer: {
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 12,
  },
});
