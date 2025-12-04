import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../contexts/ThemeContext';
import { useAppSelector } from '../store/hooks';
import { ScreenContainer } from '../components/ScreenContainer';
import { RootStackParamList, HistoryItem } from '../types';
import { getUserHistory, getAnalysisResult } from '../api/analyze';
import { getCurrentUserId } from '../utils/storage';
import { Ionicons } from '@expo/vector-icons';

type HistoryScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'History'
>;

interface Props {
  navigation: HistoryScreenNavigationProp;
}

export const HistoryScreen: React.FC<Props> = ({ navigation }) => {
  const { theme } = useTheme();
  const token = useAppSelector((state) => state.auth.token);
  const user = useAppSelector((state) => state.auth.user);
  
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchText, setSearchText] = useState('');

  const loadHistory = useCallback(async () => {
    try {
      // 获取当前用户 ID（登录用户或匿名用户）
      const userId = user?.userId || await getCurrentUserId();
      
      // 从后端获取历史记录
      const response = await getUserHistory(userId, token || undefined);
      setHistory(response.items);
    } catch (error) {
      console.error('Failed to load history:', error);
      setHistory([]);
    } finally {
      setLoading(false);
    }
  }, [token, user?.userId]);

  // 页面获得焦点时刷新
  useFocusEffect(
    useCallback(() => {
      loadHistory();
    }, [loadHistory])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadHistory();
    setRefreshing(false);
  };

  const handleViewDetail = async (item: HistoryItem) => {
    try {
      // 获取当前用户 ID
      const userId = user?.userId || await getCurrentUserId();
      
      // 从后端获取完整的分析结果
      const result = await getAnalysisResult(item.sessionId, userId, token || undefined);
      
      if (result.analysis_result) {
        navigation.navigate('Result', {
          sessionId: item.sessionId,
          riskLevel: item.riskLevel,
          result: result.analysis_result,
        });
      }
    } catch (error) {
      console.error('Failed to get analysis result:', error);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return '刚刚';
    if (diffMins < 60) return `${diffMins}分钟前`;
    if (diffHours < 24) return `${diffHours}小时前`;
    if (diffDays < 7) return `${diffDays}天前`;

    return date.toLocaleDateString('zh-CN');
  };

  const getRiskConfig = (level: string) => {
    switch (level) {
      case 'HIGH':
      case 'CRITICAL':
        return {
          bg: theme.colors.riskHighBg,
          text: theme.colors.riskHigh,
          label: '高风险',
          icon: 'alert-circle' as const,
        };
      case 'MEDIUM':
        return {
          bg: theme.colors.riskMediumBg,
          text: theme.colors.riskMedium,
          label: '中度风险',
          icon: 'alert' as const,
        };
      case 'LOW':
        return {
          bg: theme.colors.riskLowBg,
          text: theme.colors.riskLow,
          label: '低风险',
          icon: 'checkmark-circle' as const,
        };
      default:
        return {
          bg: theme.colors.riskSafeBg,
          text: theme.colors.riskSafe,
          label: '健康',
          icon: 'checkmark-circle' as const,
        };
    }
  };

  const filteredHistory = searchText
    ? history.filter((item) =>
        item.summary?.toLowerCase().includes(searchText.toLowerCase())
      )
    : history;

  return (
    <ScreenContainer backgroundColor={theme.colors.background}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={[styles.searchBar, { backgroundColor: theme.colors.inputBackground }]}>
          <Ionicons name="search" size={16} color={theme.colors.textTertiary} />
          <TextInput
            style={[styles.searchInput, { color: theme.colors.textPrimary }]}
            placeholder="搜索对话记录..."
            placeholderTextColor={theme.colors.textTertiary}
            value={searchText}
            onChangeText={setSearchText}
          />
        </View>
      </View>

      {/* History List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
            加载中...
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {filteredHistory.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="document-text-outline" size={48} color={theme.colors.textTertiary} />
              <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                {searchText ? '没有找到匹配的记录' : '暂无分析历史'}
              </Text>
              {!searchText && (
                <TouchableOpacity
                  onPress={() => navigation.navigate('AnalyzeInput')}
                  activeOpacity={0.8}
                  style={styles.emptyButtonWrapper}
                >
                  <LinearGradient
                    colors={[theme.colors.primary, theme.colors.gradientEnd]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.emptyButton}
                  >
                    <Text style={styles.emptyButtonText}>开始分析</Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            filteredHistory.map((item, index) => {
              const riskConfig = getRiskConfig(item.riskLevel);
              return (
                <TouchableOpacity
                  key={item.sessionId || index}
                  onPress={() => handleViewDetail(item)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.historyItem, { backgroundColor: theme.colors.surface }]}>
                    {/* Date & Time */}
                    <View style={styles.historyHeader}>
                      <View style={styles.dateRow}>
                        <Ionicons name="time-outline" size={14} color={theme.colors.textTertiary} />
                        <Text style={[styles.dateText, { color: theme.colors.textSecondary }]}>
                          {formatDate(item.createdAt)}
                        </Text>
                      </View>
                    </View>

                    {/* Summary */}
                    <Text
                      style={[styles.summaryText, { color: theme.colors.textPrimary }]}
                      numberOfLines={2}
                    >
                      {item.summary || '分析结果'}
                    </Text>

                    {/* Risk Badge */}
                    <View style={[styles.riskBadge, { backgroundColor: riskConfig.bg }]}>
                      <Ionicons name={riskConfig.icon} size={12} color={riskConfig.text} />
                      <Text style={[styles.riskBadgeText, { color: riskConfig.text }]}>
                        {riskConfig.label}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })
          )}

          {/* Bottom spacing */}
          <View style={styles.bottomSpacing} />
        </ScrollView>
      )}
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: 'transparent',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    height: 40,
    borderRadius: 8,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    height: 40,
    paddingVertical: 0,
    textAlignVertical: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 15,
    marginTop: 12,
  },
  emptyButtonWrapper: {
    marginTop: 24,
    borderRadius: 10,
    overflow: 'hidden',
    shadowColor: '#06B6D4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  emptyButton: {
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 10,
  },
  emptyButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  historyItem: {
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  historyHeader: {
    marginBottom: 8,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateText: {
    fontSize: 12,
  },
  summaryText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 10,
  },
  riskBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  riskBadgeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  bottomSpacing: {
    height: 24,
  },
});
