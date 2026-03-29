import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const isDark = (resolvedTheme || theme) === "dark";
  return (
    <div className="fixed right-4 top-4 z-[100]">
      <Button
        variant="secondary"
        size="icon"
        aria-label="Toggle theme"
        className="backdrop-blur supports-[backdrop-filter]:bg-background/60 border shadow hover:shadow-md transition-all"
        onClick={() => setTheme(isDark ? "light" : "dark")}
      >
        {mounted && isDark ? (
          <Sun className="h-5 w-5" />
        ) : (
          <Moon className="h-5 w-5" />
        )}
      </Button>
    </div>
  );
}
