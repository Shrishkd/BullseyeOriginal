import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useThemeStore } from '@/stores/themeStore';

export const ThemeToggle = () => {
  const { theme, toggleTheme } = useThemeStore();

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      className="transition-smooth hover:bg-muted"
    >
      {theme === 'dark' ? (
        <Sun className="h-5 w-5 text-primary" />
      ) : (
        <Moon className="h-5 w-5 text-primary" />
      )}
    </Button>
  );
};
