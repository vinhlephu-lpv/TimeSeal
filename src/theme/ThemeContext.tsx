import React, { createContext, useContext } from 'react';
import { lightColors, ThemeColors } from './colors';
import { darkColors } from './darkColors';
import { useAuthStore } from '../store/authStore';

type ThemeContextType = {
  colors: ThemeColors;
  isDark: boolean;
  toggleDarkMode: () => void;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isDark = useAuthStore(state => state.darkMode);
  const setDarkMode = useAuthStore(state => state.setDarkMode);

  const colors = isDark ? darkColors : lightColors;

  const toggleDarkMode = () => {
    setDarkMode(!isDark);
  };

  return (
    <ThemeContext.Provider value={{ colors, isDark, toggleDarkMode }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export type { ThemeColors };
