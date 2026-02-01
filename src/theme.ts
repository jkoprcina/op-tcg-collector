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
  background: '#F5F7FA',
  surface: '#FFFFFF',
  primary: '#2C3930',
  success: '#3F4F44',
  accent: '#A27B5C',
  text: '#DCD7C9',
  mutedText: '#A27B5C',
  border: '#E0E3E7',
  chip: '#F0F3F7',
};

const darkColors: ThemeColors = {
  background: '#1a1a1a',
  surface: '#2C3930',
  primary: '#3F4F44',
  success: '#A27B5C',
  accent: '#DCD7C9',
  text: '#DCD7C9',
  mutedText: '#A27B5C',
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
