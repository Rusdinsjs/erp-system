import { MD3DarkTheme } from 'react-native-paper';

export const PremiumDarkTheme = {
    ...MD3DarkTheme,
    colors: {
        ...MD3DarkTheme.colors,
        primary: '#3b82f6', // blue-500
        onPrimary: '#FFFFFF',
        primaryContainer: '#1e3a8a', // blue-900
        onPrimaryContainer: '#bfdbfe', // blue-200
        secondary: '#64748b', // slate-500
        onSecondary: '#FFFFFF',
        secondaryContainer: '#334155', // slate-700
        onSecondaryContainer: '#e2e8f0', // slate-200
        tertiary: '#8b5cf6', // violet-500
        error: '#ef4444', // red-500
        background: '#0f172a', // slate-900 (Main BG)
        surface: '#1e293b', // slate-800 (Cards)
        surfaceVariant: '#334155', // slate-700
        onSurface: '#f8fafc', // slate-50 (Text)
        onSurfaceVariant: '#94a3b8', // slate-400 (Subtext)
        outline: '#334155', // slate-700 (Borders)
        elevation: {
            level0: 'transparent',
            level1: '#1e293b',
            level2: '#1e293b',
            level3: '#1e293b',
            level4: '#1e293b',
            level5: '#1e293b',
        },
    },
    // Custom roundness for polished look
    roundness: 3,
};

// Also export a Light theme just in case, but focused on Dark
export const PremiumLightTheme = {
    ...MD3DarkTheme, // Base on Dark to minimize work unless full light mode requested
    colors: {
        ...MD3DarkTheme.colors,
        // Just overlays to make it usable if system forces light
        background: '#ffffff',
        surface: '#f1f5f9',
        onSurface: '#0f172a',
    }
};
