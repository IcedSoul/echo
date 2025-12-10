import React from 'react';
import { View, StyleSheet, StatusBar, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';

interface Props {
    children: React.ReactNode;
    style?: ViewStyle;
    backgroundColor?: string;
    /** 是否处理顶部安全区域，默认 false（因为 header 已处理） */
    safeAreaTop?: boolean;
    /** 是否处理底部安全区域，默认 true */
    safeAreaBottom?: boolean;
}

export const ScreenContainer: React.FC<Props> = ({
    children,
    style,
    backgroundColor,
    safeAreaTop = false,
    safeAreaBottom = true,
}) => {
    const { theme } = useTheme();

    const bgColor = backgroundColor || theme.colors.background;

    const edges = [];
    if (safeAreaTop) edges.push('top');
    if (safeAreaBottom) edges.push('bottom');
    edges.push('left', 'right');

    return (
        <View style={[styles.container, { backgroundColor: bgColor }]}>
            <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
            <SafeAreaView
                style={styles.safeArea}
                edges={edges as any}
            >
                <View style={[styles.content, style]}>
                    {children}
                </View>
            </SafeAreaView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    safeArea: {
        flex: 1,
    },
    content: {
        flex: 1,
    },
});
