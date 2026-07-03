import { useTheme } from "./ThemeContext";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button className="theme-toggle" onClick={toggleTheme} type="button">
      <span>{theme === "dark" ? "Dark" : "Light"} mode</span>
      <span className="theme-toggle-track">
        <span className={`theme-toggle-thumb theme-${theme}`} />
      </span>
    </button>
  );
}
