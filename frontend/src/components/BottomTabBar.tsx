/**
 * 底部导航栏组件
 * 左侧首页，中间AI聊天，右侧个人中心
 */

import React from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Text,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { useNavigation } from '@react-navigation/native';

interface Props {
  currentRoute?: string;
}

export const BottomTabBar: React.FC<Props> = ({ currentRoute }) => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();

  const isHome = currentRoute === 'Home';
  const isChat = currentRoute === 'AIChat';
  const isProfile = currentRoute === 'Profile';

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.surface,
          paddingBottom: insets.bottom > 0 ? insets.bottom : 16,
          borderTopColor: theme.colors.border,
        },
      ]}
    >
      {/* 首页按钮 */}
      <TouchableOpacity
        style={styles.tabButton}
        onPress={() => navigation.navigate('Home')}
        activeOpacity={0.7}
      >
        <Ionicons
          name={isHome ? 'home' : 'home-outline'}
          size={24}
          color={isHome ? theme.colors.primary : theme.colors.textTertiary}
        />
        <Text
          style={[
            styles.tabLabel,
            { color: isHome ? theme.colors.primary : theme.colors.textTertiary },
          ]}
        >
          首页
        </Text>
      </TouchableOpacity>

      {/* 中间的AI聊天按钮 */}
      <TouchableOpacity
        style={styles.centerButtonContainer}
        onPress={() => navigation.navigate('AIChat')}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={isChat ? ['#06B6D4', '#3B82F6'] : ['#06B6D4', '#3B82F6']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.centerButton}
        >
          <Ionicons name="chatbubble-ellipses" size={26} color="#FFF" />
        </LinearGradient>
      </TouchableOpacity>

      {/* 个人中心按钮 */}
      <TouchableOpacity
        style={styles.tabButton}
        onPress={() => navigation.navigate('Profile')}
        activeOpacity={0.7}
      >
        <Ionicons
          name={isProfile ? 'person' : 'person-outline'}
          size={24}
          color={isProfile ? theme.colors.primary : theme.colors.textTertiary}
        />
        <Text
          style={[
            styles.tabLabel,
            { color: isProfile ? theme.colors.primary : theme.colors.textTertiary },
          ]}
        >
          我的
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingTop: 12,
    borderTopWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 8,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  tabLabel: {
    fontSize: 11,
    marginTop: 4,
  },
  centerButtonContainer: {
    marginTop: -30,
    shadowColor: '#06B6D4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  centerButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
