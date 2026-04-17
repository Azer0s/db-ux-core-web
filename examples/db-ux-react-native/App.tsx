import React, { useState } from "react";
import {
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useFonts } from "expo-font";
import { DBFontProvider, DBFontFamily } from "@db-ux/react-native-core-components";
import BadgeShowcase from "./screens/BadgeShowcase";
import ButtonShowcase from "./screens/ButtonShowcase";
import InputShowcase from "./screens/InputShowcase";
import FeedbackShowcase from "./screens/FeedbackShowcase";
import FormShowcase from "./screens/FormShowcase";
import LayoutShowcase from "./screens/LayoutShowcase";
import TabsShowcase from "./screens/TabsShowcase";
import NavigationShowcase from "./screens/NavigationShowcase";
import CardShowcase from "./screens/CardShowcase";
import TagShowcase from "./screens/TagShowcase";
import LinkShowcase from "./screens/LinkShowcase";
import StackShowcase from "./screens/StackShowcase";
import DrawerShowcase from "./screens/DrawerShowcase";
import OverlayShowcase from "./screens/OverlayShowcase";

const SCREENS = [
  { key: "button",     label: "Button",     component: ButtonShowcase },
  { key: "badge",      label: "Badge",      component: BadgeShowcase },
  { key: "tag",        label: "Tag",        component: TagShowcase },
  { key: "input",      label: "Input",      component: InputShowcase },
  { key: "form",       label: "Form",       component: FormShowcase },
  { key: "feedback",   label: "Feedback",   component: FeedbackShowcase },
  { key: "layout",     label: "Layout",     component: LayoutShowcase },
  { key: "card",       label: "Card",       component: CardShowcase },
  { key: "stack",      label: "Stack",      component: StackShowcase },
  { key: "link",       label: "Link",       component: LinkShowcase },
  { key: "tabs",       label: "Tabs",       component: TabsShowcase },
  { key: "navigation", label: "Navigation", component: NavigationShowcase },
  { key: "drawer",     label: "Drawer",     component: DrawerShowcase },
  { key: "overlay",    label: "Overlay",    component: OverlayShowcase },
] as const;

type ScreenKey = (typeof SCREENS)[number]["key"];
type ColorScheme = "light" | "dark";

const DARK_BG = "#16181b";
const LIGHT_BG = "#ffffff";

const RootContainer = Platform.OS === "web" ? View : SafeAreaView;

export default function App() {
  const [active, setActive] = useState<ScreenKey>("button");
  const [colorScheme, setColorScheme] = useState<ColorScheme>("light");
  const isDark = colorScheme === "dark";

  const [fontsLoaded] = useFonts({
    [DBFontFamily.regular]:  require("./assets/fonts/OpenSans-Regular.ttf"),
    [DBFontFamily.medium]:   require("./assets/fonts/OpenSans-Medium.ttf"),
    [DBFontFamily.semibold]: require("./assets/fonts/OpenSans-SemiBold.ttf"),
    [DBFontFamily.bold]:     require("./assets/fonts/OpenSans-Bold.ttf"),
  });

  const ActiveScreen = SCREENS.find((s) => s.key === active)!.component;

  const bg   = isDark ? DARK_BG : LIGHT_BG;
  const tabBorderColor  = isDark ? "#3b3e44" : "#e1e2e6";
  const tabTextColor    = isDark ? "#a6abb6" : "#5a5e68";
  const tabActiveColor  = "#ec0016";
  const toggleBg        = isDark ? "#2e3036" : "#f3f3f5";
  const toggleTextColor = isDark ? "#edeef0" : "#2e3036";

  return (
    <DBFontProvider fontsLoaded={fontsLoaded ?? false} colorScheme={colorScheme}>
      <RootContainer style={[styles.root, { backgroundColor: bg }]}>
        <StatusBar
          barStyle={isDark ? "light-content" : "dark-content"}
          backgroundColor={bg}
        />

        <View style={[styles.navBar, { borderBottomColor: tabBorderColor, backgroundColor: bg }]}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabBarContent}
            style={styles.tabScroll}
          >
            {SCREENS.map((screen) => (
              <TouchableOpacity
                key={screen.key}
                style={[styles.tab, active === screen.key && { borderBottomColor: tabActiveColor }]}
                onPress={() => setActive(screen.key)}
              >
                <Text
                  style={[
                    styles.tabLabel,
                    { color: active === screen.key ? tabActiveColor : tabTextColor },
                    active === screen.key && styles.tabLabelActive,
                  ]}
                >
                  {screen.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Dark mode toggle */}
          <Pressable
            style={[styles.themeToggle, { backgroundColor: toggleBg }]}
            onPress={() => setColorScheme(isDark ? "light" : "dark")}
            accessibilityLabel={isDark ? "Switch to light mode" : "Switch to dark mode"}
          >
            <Text style={[styles.themeToggleIcon, { color: toggleTextColor }]}>
              {isDark ? "☀️" : "🌙"}
            </Text>
          </Pressable>
        </View>

        <View style={styles.content}>
          <ActiveScreen />
        </View>
      </RootContainer>
    </DBFontProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight ?? 0 : 0,
  },
  navBar: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
  },
  tabScroll: {
    flex: 1,
  },
  tabBarContent: {
    paddingHorizontal: 4,
  },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: "500",
  },
  tabLabelActive: {
    fontWeight: "700",
  },
  themeToggle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  themeToggleIcon: {
    fontSize: 16,
  },
  content: {
    flex: 1,
  },
});


