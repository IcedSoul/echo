import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../contexts/ThemeContext';
import { ScreenContainer } from '../components/ScreenContainer';
import { RootStackParamList } from '../types';
import { Ionicons } from '@expo/vector-icons';

type WelcomeScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'Welcome'
>;

interface Props {
  navigation: WelcomeScreenNavigationProp;
}

export const WelcomeScreen: React.FC<Props> = ({ navigation }) => {
  const { theme } = useTheme();

  const handleLogin = () => {
    navigation.navigate('Auth');
  };

  return (
    <ScreenContainer backgroundColor={theme.colors.surface} safeAreaTop>
      <View style={styles.content}>
        {/* Logo & Title */}
        <View style={styles.logoContainer}>
          <Image
            source={require('../../assets/icon-2.png')}
            style={styles.logoImage}
          />
          <Text style={[styles.title, { color: theme.colors.textPrimary }]}>
            Wavecho
          </Text>
          <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
            用回声，理解每段对话的真实含义
          </Text>
        </View>

        {/* Features */}
        <View style={styles.featuresContainer}>
          <FeatureItem
            icon="chatbubbles-outline"
            title="客观分析"
            description="从第三方视角审视冲突"
          />
          <FeatureItem
            icon="heart-outline"
            title="情绪洞察"
            description="理解真实的情绪和需求"
          />
          <FeatureItem
            icon="bulb-outline"
            title="温和建议"
            description="获得可行的沟通建议"
          />
        </View>

        {/* Buttons */}
        <View style={styles.buttonContainer}>
          {/* Primary Login Button with Gradient */}
          <TouchableOpacity
            onPress={handleLogin}
            activeOpacity={0.8}
            style={styles.gradientButtonWrapper}
          >
            <LinearGradient
              colors={[theme.colors.primary, theme.colors.gradientEnd]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.gradientButton}
            >
              <Text style={styles.gradientButtonText}>登录 / 注册</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Disclaimer */}
        <Text style={[styles.disclaimer, { color: theme.colors.textTertiary }]}>
          Wavecho 是沟通辅助工具，不能替代专业心理咨询。
        </Text>
      </View>
    </ScreenContainer>
  );
};

const FeatureItem: React.FC<{
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
}> = ({ icon, title, description }) => {
  const { theme } = useTheme();

  return (
    <View style={styles.featureItem}>
      <View style={[styles.featureIconContainer, { backgroundColor: theme.colors.primaryAlpha10 }]}>
        <Ionicons name={icon} size={24} color={theme.colors.primary} />
      </View>
      <View style={styles.featureText}>
        <Text style={[styles.featureTitle, { color: theme.colors.textPrimary }]}>
          {title}
        </Text>
        <Text style={[styles.featureDescription, { color: theme.colors.textSecondary }]}>
          {description}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  content: {
    flex: 1,
    paddingHorizontal: 32,
    justifyContent: 'center',
    paddingVertical: 48,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logoImage: {
    width: 80,
    height: 80,
    borderRadius: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '600',
    marginTop: 20,
  },
  subtitle: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  featuresContainer: {
    gap: 16,
    marginBottom: 48,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  featureIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 15,
    fontWeight: '500',
  },
  featureDescription: {
    fontSize: 13,
    marginTop: 2,
  },
  buttonContainer: {
    width: '100%',
    gap: 12,
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
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  gradientButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  disclaimer: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 32,
  },
});
