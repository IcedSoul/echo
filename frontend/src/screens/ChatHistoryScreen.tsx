/**
 * 聊天历史界面
 * 显示用户的所有聊天会话列表
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { ScreenContainer } from '../components/ScreenContainer';
import { RootStackParamList } from '../types';
import { useAppSelector } from '../store/hooks';
import { getChatSessions, deleteChatSession, ChatHistoryItem } from '../api/chat';
import { showError, showSuccess } from '../utils/toast';

type ChatHistoryScreenNavigationProp = StackNavigationProp<RootStackParamList, 'ChatHistory'>;

interface Props {
  navigation: ChatHistoryScreenNavigationProp;
}

export const ChatHistoryScreen: React.FC<Props> = ({ navigation }) => {
  const { theme } = useTheme();
  const user = useAppSelector((state) => state.auth.user);
  const token = useAppSelector((state) => state.auth.token);

  const [sessions, setSessions] = useState<ChatHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadSessions = useCallback(async () => {
    if (!user?.userId) return;

    try {
      const response = await getChatSessions(user.userId, token || undefined);
      setSessions(response.sessions);
    } catch (error) {
      console.error('Failed to load chat sessions:', error);
      showError({ title: '错误', message: '加载聊天记录失败' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.userId, token]);

  useFocusEffect(
    useCallback(() => {
      loadSessions();
    }, [loadSessions])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    loadSessions();
  };

  const handleOpenSession = (sessionId: string) => {
    navigation.navigate('AIChat', { sessionId });
  };

  const handleDeleteSession = (sessionId: string) => {
    Alert.alert(
      '删除对话',
      '确定要删除这个对话吗？删除后无法恢复。',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '删除',
          style: 'destructive',
          onPress: async () => {
            if (!user?.userId) return;
            try {
              await deleteChatSession(sessionId, user.userId, token || undefined);
              setSessions((prev) => prev.filter((s) => s.session_id !== sessionId));
              showSuccess({ title: '成功', message: '对话已删除' });
            } catch (error) {
              console.error('Failed to delete session:', error);
              showError({ title: '错误', message: '删除失败' });
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    } else if (days === 1) {
      return '昨天';
    } else if (days < 7) {
      return `${days}天前`;
    } else {
      return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
    }
  };

  const renderItem = ({ item }: { item: ChatHistoryItem }) => (
    <TouchableOpacity
      style={[styles.sessionItem, { backgroundColor: theme.colors.surface }]}
      onPress={() => handleOpenSession(item.session_id)}
      activeOpacity={0.7}
    >
      <View style={styles.sessionContent}>
        <View style={styles.sessionHeader}>
          <Text style={[styles.sessionTitle, { color: theme.colors.textPrimary }]} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={[styles.sessionDate, { color: theme.colors.textTertiary }]}>
            {formatDate(item.updated_at)}
          </Text>
        </View>
        <Text style={[styles.sessionPreview, { color: theme.colors.textSecondary }]} numberOfLines={2}>
          {item.last_message || '暂无消息'}
        </Text>
      </View>
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => handleDeleteSession(item.session_id)}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons name="trash-outline" size={18} color={theme.colors.error} />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="chatbubbles-outline" size={64} color={theme.colors.textTertiary} />
      <Text style={[styles.emptyTitle, { color: theme.colors.textSecondary }]}>
        暂无聊天记录
      </Text>
      <Text style={[styles.emptySubtitle, { color: theme.colors.textTertiary }]}>
        开始一个新对话吧
      </Text>
      <TouchableOpacity
        style={[styles.newChatButton, { borderColor: theme.colors.primary }]}
        onPress={() => navigation.navigate('AIChat', {})}
      >
        <Ionicons name="add-circle-outline" size={20} color={theme.colors.primary} />
        <Text style={[styles.newChatText, { color: theme.colors.primary }]}>
          开始新对话
        </Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <ScreenContainer backgroundColor={theme.colors.background}>
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : (
        <FlatList
          data={sessions}
          renderItem={renderItem}
          keyExtractor={(item) => item.session_id}
          contentContainerStyle={[
            styles.listContent,
            sessions.length === 0 && styles.emptyListContent,
          ]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={renderEmpty}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={theme.colors.primary}
            />
          }
        />
      )}
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  emptyListContent: {
    flex: 1,
  },
  sessionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  sessionContent: {
    flex: 1,
  },
  sessionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  sessionTitle: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
    marginRight: 12,
  },
  sessionDate: {
    fontSize: 12,
  },
  sessionPreview: {
    fontSize: 13,
    lineHeight: 18,
  },
  deleteButton: {
    padding: 8,
    marginLeft: 8,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  newChatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 24,
  },
  newChatText: {
    fontSize: 15,
    fontWeight: '500',
  },
});

