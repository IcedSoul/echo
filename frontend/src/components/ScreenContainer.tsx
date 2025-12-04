import React from 'react';
import { View, StyleSheet, StatusBar, SafeAreaView, ViewStyle } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

interface Props {
    children: React.ReactNode;
    style?: ViewStyle;
    backgroundColor?: string;
}

export const ScreenContainer: React.FC<Props> = ({
    children,
    style,
    backgroundColor
}) => {
    const { theme } = useTheme();

    const bgColor = backgroundColor || theme.colors.background;

    return (
        <View style={[styles.container, { backgroundColor: bgColor }]}>
            <StatusBar barStyle="light-content" backgroundColor={theme.colors.primary} />
            <SafeAreaView style={styles.safeArea}>
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
