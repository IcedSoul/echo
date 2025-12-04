import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

interface Props {
    title?: string;
    showBack?: boolean;
    rightAction?: React.ReactNode;
}

export const Header: React.FC<Props> = ({ title = 'Wavecho', showBack = false, rightAction }) => {
    const { theme } = useTheme();
    const navigation = useNavigation();

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.primary }]}>
            <View style={styles.leftContainer}>
                {showBack && (
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                        <Ionicons name="chevron-back" size={24} color={theme.colors.textWhite} />
                    </TouchableOpacity>
                )}
            </View>

            <View style={styles.titleContainer}>
                <Text style={[theme.typography.h3, { color: theme.colors.textWhite }]}>
                    {title}
                </Text>
            </View>

            <View style={styles.rightContainer}>
                {rightAction}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        height: 56,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
    },
    leftContainer: {
        width: 40,
        alignItems: 'flex-start',
    },
    titleContainer: {
        flex: 1,
        alignItems: 'center',
    },
    rightContainer: {
        width: 40,
        alignItems: 'flex-end',
    },
    backButton: {
        padding: 4,
    },
});
