import { useDBFont } from "@db-ux/react-native-core-components";

export interface ScreenColors {
  bg: string;
  surface: string;
  heading: string;
  body: string;
  muted: string;
  subtle: string;
  placeholder: string;
}

const light: ScreenColors = {
  bg: "#f5f5f5",
  surface: "#ffffff",
  heading: "#16181b",
  body: "#2e3036",
  muted: "#5a5e68",
  subtle: "#727782",
  placeholder: "#a6abb6",
};

const dark: ScreenColors = {
  bg: "#16181b",
  surface: "#23262b",
  heading: "#f0f1f3",
  body: "#cfd1d6",
  muted: "#9da2ac",
  subtle: "#7a7f8c",
  placeholder: "#4a4f5c",
};

export function useScreenColors(): ScreenColors {
  const { isDark } = useDBFont();
  return isDark ? dark : light;
}
