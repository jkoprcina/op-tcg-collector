export type ThemeColors = {
  background: string;
  surface: string;
  primary: string;
  success: string;
  accent: string;
  text: string;
  mutedText: string;
  border: string;
  chip: string;
};

const lightColors: ThemeColors = {
  background: '#F8F9FB',
  surface: '#FFFFFF',
  primary: '#D35400',
  success: '#27AE60',
  accent: '#E74C3C',
  text: '#1A1A1A',
  mutedText: '#6B7280',
  border: '#E5E7EB',
  chip: '#F3F4F6',
};

const darkColors: ThemeColors = {
  background: '#1a1a1a',
  surface: '#2C3930',
  primary: '#A27B5C',
  success: '#3F4F44',
  accent: '#A27B5C',
  text: '#DCD7C9',
  mutedText: '#B9A08B',
  border: '#3F4F44',
  chip: '#2C3930',
};

export function getTheme(mode: 'light' | 'dark') {
  return {
    colors: mode === 'light' ? lightColors : darkColors,
    text: {
      title: { fontSize: 22, fontWeight: '700' as const },
      subtitle: { fontSize: 16, fontWeight: '600' as const },
      body: { fontSize: 14, fontWeight: '400' as const },
      caption: { fontSize: 12, fontWeight: '400' as const },
    },
    spacing: {
      xs: 6,
      sm: 10,
      md: 14,
      lg: 18,
      xl: 24,
    },
    radius: {
      sm: 8,
      md: 12,
      lg: 16,
    },
    shadow: {
      card: {
        shadowColor: '#000',
        shadowOpacity: mode === 'light' ? 0.08 : 0.3,
        shadowOffset: { width: 0, height: 4 },
        shadowRadius: 8,
        elevation: 2,
      },
    },
  };
}

// Legacy export for backward compatibility
export const theme = {
  colors: lightColors,
  text: {
    title: { fontSize: 22, fontWeight: '700' as const },
    subtitle: { fontSize: 16, fontWeight: '600' as const },
    body: { fontSize: 14, fontWeight: '400' as const },
    caption: { fontSize: 12, fontWeight: '400' as const },
  },
  spacing: {
    xs: 6,
    sm: 10,
    md: 14,
    lg: 18,
    xl: 24,
  },
  radius: {
    sm: 8,
    md: 12,
    lg: 16,
  },
  shadow: {
    card: {
      shadowColor: '#000',
      shadowOpacity: 0.08,
      shadowOffset: { width: 0, height: 4 },
      shadowRadius: 8,
      elevation: 2,
    },
  },
};
