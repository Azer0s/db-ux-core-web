import React, { useState } from "react";
import {
  Platform,
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

const SCREENS = [
  { key: "button",     label: "Button",     component: ButtonShowcase },
  { key: "badge",      label: "Badge",      component: BadgeShowcase },
  { key: "input",      label: "Input",      component: InputShowcase },
  { key: "form",       label: "Form",       component: FormShowcase },
  { key: "feedback",   label: "Feedback",   component: FeedbackShowcase },
  { key: "layout",     label: "Layout",     component: LayoutShowcase },
  { key: "tabs",       label: "Tabs",       component: TabsShowcase },
  { key: "navigation", label: "Navigation", component: NavigationShowcase },
] as const;

type ScreenKey = (typeof SCREENS)[number]["key"];

const RootContainer = Platform.OS === "web" ? View : SafeAreaView;

export default function App() {
  const [active, setActive] = useState<ScreenKey>("button");
  const [fontsLoaded] = useFonts({
    [DBFontFamily.regular]:  require("./assets/fonts/OpenSans-Regular.ttf"),
    [DBFontFamily.medium]:   require("./assets/fonts/OpenSans-Medium.ttf"),
    [DBFontFamily.semibold]: require("./assets/fonts/OpenSans-SemiBold.ttf"),
    [DBFontFamily.bold]:     require("./assets/fonts/OpenSans-Bold.ttf"),
  });

  const ActiveScreen = SCREENS.find((s) => s.key === active)!.component;

  return (
    <DBFontProvider fontsLoaded={fontsLoaded ?? false}>
      <RootContainer style={styles.root}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />

        <View style={styles.tabBarWrapper}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabBarContent}
          >
            {SCREENS.map((screen) => (
              <TouchableOpacity
                key={screen.key}
                style={[styles.tab, active === screen.key && styles.tabActive]}
                onPress={() => setActive(screen.key)}
              >
                <Text
                  style={[
                    styles.tabLabel,
                    active === screen.key && styles.tabLabelActive,
                  ]}
                >
                  {screen.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
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
    backgroundColor: "#fff",
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight ?? 0 : 0,
  },
  tabBarWrapper: {
    borderBottomWidth: 1,
    borderBottomColor: "#e1e2e6",
    backgroundColor: "#fff",
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
  tabActive: {
    borderBottomColor: "#ec0016",
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: "500",
    color: "#5a5e68",
  },
  tabLabelActive: {
    color: "#ec0016",
    fontWeight: "700",
  },
  content: {
    flex: 1,
  },
});

