import React, { useRef, useState } from "react";
import { Platform, Pressable, ScrollView, StatusBar, StyleSheet, TouchableOpacity, View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { DBFontProvider, DBText, useDBFont } from "@db-ux/react-native-core-components";
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
import AccordionShowcase from "./screens/AccordionShowcase";
import IconShowcase from "./screens/IconShowcase";
import HeaderShowcase from "./screens/HeaderShowcase";
import SelectShowcase from "./screens/SelectShowcase";
import StructureShowcase from "./screens/StructureShowcase";

const SCREENS = [
  { key: "button", label: "Button", component: ButtonShowcase },
  { key: "badge", label: "Badge", component: BadgeShowcase },
  { key: "tag", label: "Tag", component: TagShowcase },
  { key: "input", label: "Input", component: InputShowcase },
  { key: "form", label: "Form", component: FormShowcase },
  { key: "feedback", label: "Feedback", component: FeedbackShowcase },
  { key: "layout", label: "Layout", component: LayoutShowcase },
  { key: "card", label: "Card", component: CardShowcase },
  { key: "stack", label: "Stack", component: StackShowcase },
  { key: "accordion", label: "Accordion", component: AccordionShowcase },
  { key: "link", label: "Link", component: LinkShowcase },
  { key: "icon", label: "Icon", component: IconShowcase },
  { key: "tabs", label: "Tabs", component: TabsShowcase },
  { key: "navigation", label: "Navigation", component: NavigationShowcase },
  { key: "header", label: "Header", component: HeaderShowcase },
  { key: "drawer", label: "Drawer", component: DrawerShowcase },
  { key: "select", label: "Select", component: SelectShowcase },
  { key: "structure", label: "Section", component: StructureShowcase },
  { key: "overlay", label: "Overlay", component: OverlayShowcase },
] as const;

type ScreenKey = (typeof SCREENS)[number]["key"];
type ColorScheme = "light" | "dark";

const DARK_BG = "#16181b";
const LIGHT_BG = "#ffffff";

const RootContainer = Platform.OS === "web" ? View : SafeAreaView;

function AppInner({ onToggleScheme }: { onToggleScheme: () => void }) {
  const [active, setActive] = useState<ScreenKey>("button");
  const { isDark, fontFamily: f } = useDBFont();
  const [scrollState, setScrollState] = useState({ canScrollLeft: false, canScrollRight: true });
  const tabScrollRef = useRef<ScrollView>(null);

  const ActiveScreen = SCREENS.find((s) => s.key === active)!.component;

  const bg = isDark ? DARK_BG : LIGHT_BG;
  const tabBorderColor = isDark ? "#3b3e44" : "#e1e2e6";
  const tabTextColor = isDark ? "#a6abb6" : "#5a5e68";
  const tabActiveColor = "#ec0016";
  const toggleBg = isDark ? "#2e3036" : "#f3f3f5";

  function handleScroll(e: any) {
    const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
    const x = contentOffset.x;
    const maxX = contentSize.width - layoutMeasurement.width;
    setScrollState({ canScrollLeft: x > 4, canScrollRight: x < maxX - 4 });
  }

  return (
    <RootContainer style={[styles.root, { backgroundColor: bg }]}>
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        backgroundColor={bg}
      />

      <View style={[styles.navBar, { borderBottomColor: tabBorderColor, backgroundColor: bg }]}>
        <View style={styles.tabScrollWrap}>
          <ScrollView
            ref={tabScrollRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabBarContent}
            style={styles.tabScroll}
            onScroll={handleScroll}
            scrollEventThrottle={16}
          >
            {SCREENS.map((screen) => (
              <TouchableOpacity
                key={screen.key}
                style={[styles.tab, active === screen.key && { borderBottomColor: tabActiveColor }]}
                onPress={() => setActive(screen.key)}
              >
                <DBText
                  style={[
                    styles.tabLabel,
                    { color: active === screen.key ? tabActiveColor : tabTextColor, fontFamily: f.regular },
                    active === screen.key && { fontFamily: f.bold },
                  ]}
                >
                  {screen.label}
                </DBText>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Left fade */}
          {scrollState.canScrollLeft && (
            <LinearGradient
              pointerEvents="none"
              colors={[bg, `${bg}00`]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={styles.fadeLeft}
            />
          )}
          {/* Right fade */}
          {scrollState.canScrollRight && (
            <LinearGradient
              pointerEvents="none"
              colors={[`${bg}00`, bg]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={styles.fadeRight}
            />
          )}
        </View>

        {/* Light / Dark segmented toggle */}
        <View style={[styles.segmentWrap, { backgroundColor: toggleBg }]}>
          <Pressable
            style={[styles.segment, !isDark && { backgroundColor: bg, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.12, shadowRadius: 2, elevation: 2 }]}
            onPress={() => !isDark ? null : onToggleScheme()}
            accessibilityLabel="Light mode"
          >
            <DBText style={[styles.segmentText, { color: !isDark ? tabActiveColor : tabTextColor }]}>☀</DBText>
          </Pressable>
          <Pressable
            style={[styles.segment, isDark && { backgroundColor: bg, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.12, shadowRadius: 2, elevation: 2 }]}
            onPress={() => isDark ? null : onToggleScheme()}
            accessibilityLabel="Dark mode"
          >
            <DBText style={[styles.segmentText, { color: isDark ? tabActiveColor : tabTextColor }]}>☾</DBText>
          </Pressable>
        </View>
      </View>

      <View style={styles.content}>
        <ActiveScreen />
      </View>
    </RootContainer>
  );
}

export default function App() {
  const [colorScheme, setColorScheme] = useState<ColorScheme>("light");

  return (
    <SafeAreaProvider>
      <DBFontProvider
        fonts={{
          regular: require("./assets/fonts/DBNeoScreenSans-Regular.ttf"),
          medium: require("./assets/fonts/DBNeoScreenSans-Medium.ttf"),
          semibold: require("./assets/fonts/DBNeoScreenSans-SemiBold.ttf"),
          bold: require("./assets/fonts/DBNeoScreenSans-Bold.ttf"),
        }}
        colorScheme={colorScheme}
      >
        <AppInner onToggleScheme={() => setColorScheme((s) => (s === "dark" ? "light" : "dark"))} />
      </DBFontProvider>
    </SafeAreaProvider>
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
    overflow: "hidden",
  },
  tabScrollWrap: {
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
    overflow: "hidden",
    position: "relative",
  },
  tabScroll: {
    flexGrow: 1,
    flexShrink: 1,
    minWidth: 0,
  },
  tabBarContent: {
    paddingHorizontal: 4,
    flexDirection: "row",
    alignItems: "center",
  },
  fadeLeft: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 32,
  },
  fadeRight: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    width: 32,
  },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabLabel: {
    fontSize: 13,
  },
  segmentWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 8,
    padding: 3,
    marginRight: 8,
    gap: 2,
  },
  segment: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  segmentText: {
    fontSize: 14,
  },
  content: {
    flex: 1,
  },
});
