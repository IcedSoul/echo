/**
 * AI 聊天界面
 * 提供与 AI 助手的对话交互
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
  Keyboard,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system';
import { useTheme } from '../contexts/ThemeContext';
import { ScreenContainer } from '../components/ScreenContainer';
import { INPUT_CHAT_STYLE } from '../components/Input';
import { RootStackParamList } from '../types';
import { useAppSelector } from '../store/hooks';
import { 
  sendMessage as sendChatMessage, 
  getSessionMessages,
  ChatMessage as APIChatMessage,
} from '../api/chat';
import { showError } from '../utils/toast';

type AIChatScreenNavigationProp = StackNavigationProp<RootStackParamList, 'AIChat'>;
type AIChatScreenRouteProp = RouteProp<RootStackParamList, 'AIChat'>;

interface Props {
  navigation: AIChatScreenNavigationProp;
  route: AIChatScreenRouteProp;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  imageUrl?: string;
}

const WELCOME_MESSAGE: ChatMessage = {
  id: 'welcome',
  role: 'assistant',
  content: '你好！我是 Wavecho AI 助手 👋\n\n我可以帮助你分析人际关系问题、提供沟通建议，或者只是陪你聊聊天。有什么我可以帮到你的吗？',
  timestamp: new Date(),
};

export const AIChatScreen: React.FC<Props> = ({ navigation, route }) => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const user = useAppSelector((state) => state.auth.user);
  const token = useAppSelector((state) => state.auth.token);
  
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(route.params?.sessionId || null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [initialLoading, setInitialLoading] = useState(!!route.params?.sessionId);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const flatListRef = useRef<FlatList>(null);

  // 加载已有会话
  useEffect(() => {
    if (route.params?.sessionId && user?.userId) {
      loadSession(route.params.sessionId);
    }
  }, [route.params?.sessionId, user?.userId]);

  // 键盘监听 - 处理键盘显示和隐藏
  useEffect(() => {
    const keyboardWillShowListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        setKeyboardHeight(e.endCoordinates.height + 16);
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    );

    const keyboardWillHideListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardHeight(0);
      }
    );

    return () => {
      keyboardWillShowListener.remove();
      keyboardWillHideListener.remove();
    };
  }, []);

  const loadSession = async (sid: string) => {
    if (!user?.userId) return;
    
    setInitialLoading(true);
    try {
      const response = await getSessionMessages(sid, user.userId, token || undefined);
      const loadedMessages: ChatMessage[] = response.messages.map((msg, index) => ({
        id: `${sid}-${index}`,
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp ? new Date(msg.timestamp) : new Date(),
        imageUrl: msg.image_url,
      }));
      
      setMessages(loadedMessages.length > 0 ? loadedMessages : [WELCOME_MESSAGE]);
      setSessionId(sid);
    } catch (error) {
      console.error('Failed to load session:', error);
      showError({ title: '错误', message: '加载会话失败' });
      setMessages([WELCOME_MESSAGE]);
    } finally {
      setInitialLoading(false);
    }
  };

  const handleNewChat = () => {
    setSessionId(null);
    setMessages([WELCOME_MESSAGE]);
    setInputText('');
    setSelectedImage(null);
  };

  const handlePickImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (!permissionResult.granted) {
        showError({ title: '权限提示', message: '需要访问相册权限才能选择图片' });
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets.length > 0) {
        const manipResult = await ImageManipulator.manipulateAsync(
          result.assets[0].uri,
          [{ resize: { width: 800 } }],
          { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
        );
        setSelectedImage(manipResult.uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      showError({ title: '错误', message: '选择图片失败' });
    }
  };

  const handleRemoveImage = () => {
    setSelectedImage(null);
  };

  const handleSend = useCallback(async () => {
    if ((!inputText.trim() && !selectedImage) || isLoading || !user?.userId) return;

    const messageText = inputText.trim();
    const imageUri = selectedImage;
    
    setInputText('');
    setSelectedImage(null);

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: messageText || '[发送了一张图片]',
      timestamp: new Date(),
      imageUrl: imageUri || undefined,
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);

    try {
      let imageBase64: string | undefined;
      if (imageUri) {
        const base64 = await FileSystem.readAsStringAsync(imageUri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        imageBase64 = base64;
      }

      const response = await sendChatMessage({
        session_id: sessionId || undefined,
        message: messageText || '请帮我分析这张图片',
        user_id: user.userId,
        image_base64: imageBase64,
      }, token || undefined);

      if (!sessionId) {
        setSessionId(response.session_id);
      }

      const aiMessage: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: response.reply.content,
        timestamp: new Date(),
      };
      
      setMessages((prev) => [...prev, aiMessage]);
      
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      console.error('Failed to send message:', error);
      
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: '抱歉，发送消息时遇到问题，请稍后重试。',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [inputText, selectedImage, isLoading, user?.userId, sessionId, token]);

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isUser = item.role === 'user';
    
    return (
      <View
        style={[
          styles.messageContainer,
          isUser ? styles.userMessageContainer : styles.aiMessageContainer,
        ]}
      >
        {!isUser && (
          <View style={styles.avatarContainer}>
            <LinearGradient
              colors={['#06B6D4', '#3B82F6']}
              style={styles.avatar}
            >
              <Ionicons name="water" size={16} color="#FFF" />
            </LinearGradient>
          </View>
        )}
        <View
          style={[
            styles.messageBubble,
            isUser
              ? [styles.userBubble, { backgroundColor: theme.colors.primary }]
              : [styles.aiBubble, { backgroundColor: theme.colors.surface }],
          ]}
        >
          {item.imageUrl && (
            <Image
              source={{ uri: item.imageUrl }}
              style={styles.messageImage}
              resizeMode="cover"
            />
          )}
          {item.content && item.content !== '[发送了一张图片]' && (
            <Text
              style={[
                styles.messageText,
                { color: isUser ? '#FFF' : theme.colors.textPrimary },
              ]}
            >
              {item.content}
            </Text>
          )}
        </View>
      </View>
    );
  };

  const renderTypingIndicator = () => {
    if (!isLoading) return null;
    
    return (
      <View style={[styles.messageContainer, styles.aiMessageContainer]}>
        <View style={styles.avatarContainer}>
          <LinearGradient
            colors={['#06B6D4', '#3B82F6']}
            style={styles.avatar}
          >
            <Ionicons name="water" size={16} color="#FFF" />
          </LinearGradient>
        </View>
        <View style={[styles.messageBubble, styles.aiBubble, { backgroundColor: theme.colors.surface }]}>
          <View style={styles.typingDots}>
            <View style={[styles.typingDot, { backgroundColor: theme.colors.textTertiary }]} />
            <View style={[styles.typingDot, styles.typingDotDelay1, { backgroundColor: theme.colors.textTertiary }]} />
            <View style={[styles.typingDot, styles.typingDotDelay2, { backgroundColor: theme.colors.textTertiary }]} />
          </View>
        </View>
      </View>
    );
  };

  if (initialLoading) {
    return (
      <ScreenContainer backgroundColor={theme.colors.background} safeAreaBottom={false}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
            加载对话中...
          </Text>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer backgroundColor={theme.colors.background} safeAreaBottom={false}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        {/* Header */}
        <View style={[styles.header, { backgroundColor: theme.colors.surface, paddingTop: insets.top }]}>
          {/* 左侧：Logo + 标题 */}
          <View style={styles.headerLeft}>
            <LinearGradient
              colors={['#06B6D4', '#3B82F6']}
              style={styles.headerAvatar}
            >
              <Ionicons name="water" size={18} color="#FFF" />
            </LinearGradient>
            <View style={styles.headerTextContainer}>
              <Text style={[styles.headerTitle, { color: theme.colors.textPrimary }]}>
                Wavecho AI
              </Text>
              <View style={styles.onlineStatus}>
                <View style={styles.onlineDot} />
                <Text style={[styles.onlineText, { color: theme.colors.textTertiary }]}>
                  在线
                </Text>
              </View>
            </View>
          </View>

          {/* 右侧：聊天历史 + 新会话 */}
          <View style={styles.headerRight}>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => navigation.navigate('ChatHistory')}
            >
              <Ionicons name="time-outline" size={24} color={theme.colors.textPrimary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={handleNewChat}
            >
              <Ionicons name="add-circle-outline" size={24} color={theme.colors.textPrimary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Messages List */}
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messagesList}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={renderTypingIndicator}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() => {
            flatListRef.current?.scrollToEnd({ animated: true });
          }}
        />

        {/* Selected Image Preview */}
        {selectedImage && (
          <View style={[styles.imagePreviewContainer, { backgroundColor: theme.colors.surface }]}>
            <Image source={{ uri: selectedImage }} style={styles.imagePreview} />
            <TouchableOpacity style={styles.removeImageButton} onPress={handleRemoveImage}>
              <Ionicons name="close-circle" size={24} color={theme.colors.error} />
            </TouchableOpacity>
          </View>
        )}

        {/* Input Area */}
        <View style={[
          styles.inputArea,
          {
            backgroundColor: theme.colors.surface,
            paddingBottom: insets.bottom || 0,
            marginBottom: Platform.OS === 'android' ? keyboardHeight : 0,
          }
        ]}>
          <View style={[styles.inputContainer, { backgroundColor: theme.colors.background }]}>
            <TouchableOpacity style={styles.attachButton} onPress={handlePickImage}>
              <Ionicons name="image-outline" size={22} color={theme.colors.textTertiary} />
            </TouchableOpacity>
            <TextInput
              style={[styles.textInput, { color: theme.colors.textPrimary }]}
              placeholder="输入消息..."
              placeholderTextColor={theme.colors.textTertiary}
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={2000}
              returnKeyType="send"
              onSubmitEditing={handleSend}
              blurOnSubmit={false}
            />
            <TouchableOpacity
              style={[
                styles.sendButton,
                (inputText.trim() || selectedImage) ? {} : styles.sendButtonDisabled,
              ]}
              onPress={handleSend}
              disabled={(!inputText.trim() && !selectedImage) || isLoading}
            >
              <LinearGradient
                colors={(inputText.trim() || selectedImage) ? ['#06B6D4', '#3B82F6'] : ['#94A3B8', '#94A3B8']}
                style={styles.sendButtonGradient}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Ionicons name="send" size={18} color="#FFF" />
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  headerLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextContainer: {
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  onlineStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#22C55E',
  },
  onlineText: {
    fontSize: 12,
  },
  // Messages
  messagesList: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingBottom: 20,
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    maxWidth: '85%',
  },
  userMessageContainer: {
    alignSelf: 'flex-end',
    flexDirection: 'row-reverse',
  },
  aiMessageContainer: {
    alignSelf: 'flex-start',
  },
  avatarContainer: {
    marginRight: 10,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  messageBubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
    maxWidth: '100%',
  },
  userBubble: {
    borderBottomRightRadius: 6,
  },
  aiBubble: {
    borderBottomLeftRadius: 6,
  },
  messageImage: {
    width: 200,
    height: 150,
    borderRadius: 12,
    marginBottom: 8,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
  },
  // Typing Indicator
  typingDots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    opacity: 0.5,
  },
  typingDotDelay1: {
    opacity: 0.7,
  },
  typingDotDelay2: {
    opacity: 0.9,
  },
  // Image Preview
  imagePreviewContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
    position: 'relative',
  },
  imagePreview: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  removeImageButton: {
    position: 'absolute',
    top: 4,
    left: 88,
  },
  // Input Area
  inputArea: {
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 24,
    paddingLeft: 8,
    paddingRight: 6,
    paddingVertical: 6,
    minHeight: 48,
  },
  attachButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textInput: {
    flex: 1,
    ...INPUT_CHAT_STYLE,
  },
  sendButton: {
    marginLeft: 8,
  },
  sendButtonDisabled: {
    opacity: 0.7,
  },
  sendButtonGradient: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
