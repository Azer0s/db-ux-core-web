import {
	existsSync,
	mkdirSync,
	readdirSync,
	readFileSync,
	writeFileSync
} from 'node:fs';
import { join, resolve } from 'node:path';

/** Absolute path to the monorepo root (packages/components/scripts/post-build → ../../../../) */
const REPO_ROOT = resolve(process.cwd(), '../..');

const TMP_SRC = join(REPO_ROOT, 'output/tmp/react-native/react/src');
const RN_DEST = join(REPO_ROOT, 'output/react-native/src');

// ---------------------------------------------------------------------------
// Global text transformations applied to every generated TSX file
// ---------------------------------------------------------------------------

const REMOVE_PATTERNS: RegExp[] = [
	/^"use client";\n?/m,
	/^ import \{ filterPassingProps, getRootProps \} from "\.\.\/\.\.\/utils\/react";\n?/m,
	/import \{[^}]*(?:addValueResetEventListener|addCheckedResetEventListener|addResetEventListener)[^}]*\} from "\.\.\/\.\.\/utils\/form-components";\n?/g,
	/import \{[^}]*(?:handleFrameworkEventAngular|handleFrameworkEventVue)[^}]*\} from "\.\.\/\.\.\/utils\/form-components";\n?/g,
	/import \{ ?DocumentScrollListener ?\} from "\.\.\/\.\.\/utils\/document-scroll-listener";\n?/g,
	/import \{ ?handleFixedPopover ?\} from "\.\.\/\.\.\/utils\/floating-components";\n?/g,
	/import \{ ?isEventTargetNavigationItem ?\} from "\.\.\/\.\.\/utils\/navigation";\n?/g,
	/import \{[^}]*addAttributeToChildren[^}]*\} from "\.\.\/\.\.\/utils";\n?/g,
	// Remove filterPassingProps / getRootProps spread lines from JSX
	/[ \t]*\{\.\.\.filterPassingProps\(props,\[[^\]]*\]\)\}\n?/g,
	/[ \t]*\{\.\.\.getRootProps\(props,\[[^\]]*\]\)\}\n?/g,
	// Remove id prop with propOverrides pattern
	/[ \t]*id=\{props\.id \?\? props\.propOverrides\?\.id\}\n?/g,
	// Remove data-* attribute lines from JSX
	/[ \t]*data-[a-zA-Z-]+=\{[^}]+\}\n?/g,
	/[ \t]*data-[a-zA-Z-]+="[^"]*"\n?/g,
	// Remove aria-* lines
	/[ \t]*aria-[a-zA-Z-]+=\{[^}]+\}\n?/g,
	/[ \t]*aria-[a-zA-Z-]+="[^"]*"\n?/g,
	/[ \t]*tabIndex=\{[^}]+\}\n?/g,
	// Remove web-only util calls
	/[ \t]*handleFrameworkEventAngular\([^)]*\);\n?/g,
	/[ \t]*handleFrameworkEventVue\([^)]*\);\n?/g,
	/[ \t]*addValueResetEventListener\([\s\S]*?\);\n?/g,
	/[ \t]*addCheckedResetEventListener\([\s\S]*?\);\n?/g,
	/[ \t]*addResetEventListener\([\s\S]*?\);\n?/g,
	// Remove document/window calls
	/[ \t]*document\.[^;]+;\n?/g,
	/[ \t]*window\.[^;]+;\n?/g,
	// Remove hasVoiceOver blocks
	/[ \t]*if \(hasVoiceOver\(\)\) \{[^}]+\}\n?/g,
	// Remove isIOSSafari blocks
	/[ \t]*if \(isIOSSafari\(\)\) \{[^}]+\}\n?/g,
	// Remove addAttributeToChildren calls
	/[ \t]*addAttributeToChildren\([^;]+\);\n?/g,
	// Remove querySelector / DOM method calls
	/[ \t]*const [a-zA-Z_]+ = _ref\.current\??\.(querySelector|querySelectorAll|getElementsByClassName)[^;]+;\n?/g,
	// Remove MutationObserver / ResizeObserver
	/[ \t]*(?:const )?observer = new (?:MutationObserver|ResizeObserver)\([^;]+;\n?/g,
	/[ \t]*observer\.(observe|disconnect)\([^;]*\);\n?/g
];

const REPLACEMENTS: Array<[RegExp | string, string]> = [
	// Fix React import — hooks are imported from react, RN components imported separately
	[
		`import * as React from "react";`,
		`import React, { useRef, useState, useEffect, forwardRef, useId } from "react";
import { View, Text, TouchableOpacity, TextInput, ScrollView, Modal, Pressable, SafeAreaView, StyleSheet, Image } from "react-native";
import * as Linking from "expo-linking";`
	],
	// Remove the duplicated hook import lines mitosis generates
	[/^import \{ [^}]+ \} from "react";\n?/gm, ''],
	[/^import \{ useId \} from "react";\n?/gm, ''],

	// --- forwardRef / function signature type cleanup ---
	[/Omit<\w*HTMLAttributes<HTML\w+Element \| any>, keyof \w+> & /g, ''],
	[/Omit<AnchorHTMLAttributes<HTMLAnchorElement \| any>, keyof \w+> & /g, ''],
	// forwardRef type arg: HTML*Element → View
	[/forwardRef<\nHTML\w+Element \| any,\n[^>]+>/g,
		(m: string) => m.replace(/HTML\w+Element \| any/, 'View')],
	[/forwardRef<HTML\w+Element \| any,/g, 'forwardRef<View,'],

	// --- HTML element → RN/Expo ---
	// Block containers
	[/<(div|section|nav|menu|ul|ol|li|main|footer|article|aside|figure|figcaption)\b([^>]*)>/g, '<View$2>'],
	[/<\/(div|section|nav|menu|ul|ol|li|main|footer|article|aside|figure|figcaption)>/g, '</View>'],
	// header HTML element (not DBHeader component)
	[/<header\b([^>]*)>/g, '<View$1>'],
	[/<\/header>/g, '</View>'],
	// span → View
	[/<span\b([^>]*)>/g, '<View$1>'],
	[/<\/span>/g, '</View>'],
	// button → TouchableOpacity
	[/<button\b([^>]*)>/g, '<TouchableOpacity$1>'],
	[/<\/button>/g, '</TouchableOpacity>'],
	// input (self-closing) → TextInput
	[/<input\b([^/>]*)\/?>/g, '<TextInput$1/>'],
	// textarea → TextInput multiline
	[/<textarea\b([^>]*)>/g, '<TextInput multiline$1>'],
	[/<\/textarea>/g, '</TextInput>'],
	// label → Text
	[/<label\b([^>]*)>/g, '<Text$1>'],
	[/<\/label>/g, '</Text>'],
	// anchor → TouchableOpacity
	[/<a\b([^>]*)>/g, '<TouchableOpacity$1>'],
	[/<\/a>/g, '</TouchableOpacity>'],
	// dialog → Modal
	[/<dialog\b([^>]*)>/g, '<Modal$1>'],
	[/<\/dialog>/g, '</Modal>'],
	// img → Image
	[/<img\b([^/>]*)\/?>/g, '<Image$1/>'],
	// select/option → View
	[/<select\b([^>]*)>/g, '<View$1>'],
	[/<\/select>/g, '</View>'],
	[/<option\b([^>]*)>/g, '<View$1>'],
	[/<\/option>/g, '</View>'],

	// --- Events ---
	[/\bonClick=/g, 'onPress='],
	[/\bonChange=/g, 'onChange='],
	[/\bonInput=/g, 'onChangeText='],

	// --- className → removed (no-op via utils.cls) ---
	[/[ \t]*className=\{[^}]+\}\n?/g, '\n'],

	// --- Strip HTML-only props ---
	[/[ \t]*type=\{getButtonType\(\)\}\n?/g, '\n'],
	[/[ \t]*type="[^"]*"\n?/g, '\n'],
	[/[ \t]*form=\{[^}]+\}\n?/g, '\n'],
	[/[ \t]*name=\{[^}]+\}\n?/g, '\n'],
	[/[ \t]*referrerPolicy=\{[^}]+\}\n?/g, '\n'],
	[/[ \t]*hrefLang=\{[^}]+\}\n?/g, '\n'],
	[/[ \t]*target=\{[^}]+\}\n?/g, '\n'],
	[/[ \t]*rel=\{[^}]+\}\n?/g, '\n'],
	[/[ \t]*role=\{[^}]+\}\n?/g, '\n'],
	[/[ \t]*href=\{[^}]+\}\n?/g, '\n'],
	// disabled / checked / required → Boolean()
	[/disabled=\{getBoolean\(props\.disabled, "disabled"\)\}/g, 'disabled={Boolean(props.disabled)}'],
	[/required=\{getBoolean\(props\.required, "required"\)\}/g, ''],
	[/checked=\{getBoolean\(props\.checked, "checked"\)\}/g, 'value={Boolean(props.checked)}'],
	// Generic getBoolean
	[/getBoolean\(([^,)]+),\s*"[^"]+"\)/g, 'Boolean($1)'],
	// getBooleanAsString → String
	[/getBooleanAsString\(([^)]+)\)/g, 'String($1)'],
	// Fix useRef types
	[/component \|\| useRef<HTML\w+Element \| any>\(component\)/g, 'component || useRef<View>(null)'],
	[/useRef<HTML\w+Element \| any>\(([^)]*)\)/g, 'useRef<View>($1)'],
	// Clean up blank lines
	[/\n{3,}/g, '\n\n']
];

// ---------------------------------------------------------------------------
// RN-compatible utility files
// ---------------------------------------------------------------------------

const RN_UTILS = `import React from "react";

export const uuid = (): string =>
  Math.random().toString(36).substring(2) + Date.now().toString(36);

export type ClassNameArg = string | Record<string, boolean | undefined> | undefined;

/** No-op in React Native — CSS class names have no meaning here */
export const cls = (..._args: ClassNameArg[]): string => "";

export const isArrayOfStrings = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === "string");

export const hasVoiceOver = (): boolean => false;
export const isIOSSafari = (): boolean => false;

export const delay = (fn: () => void, ms = 0): Promise<void> =>
  new Promise((resolve) => setTimeout(() => { fn(); resolve(); }, ms));

export const getBoolean = (
  value: boolean | string | undefined,
  _attr?: string
): boolean | undefined => {
  if (value == null) return undefined;
  if (typeof value === "boolean") return value;
  return value !== "false" && value !== "";
};

export const getBooleanAsString = (value: boolean | string | undefined): string | undefined => {
  if (value == null) return undefined;
  return String(value);
};

export const getHideProp = (show?: boolean | string): string | undefined => {
  if (show == null) return undefined;
  return getBoolean(show) ? "false" : "true";
};

export const getNumber = (value: string | number | undefined): number | undefined => {
  if (value == null) return undefined;
  const n = Number(value);
  return isNaN(n) ? undefined : n;
};

export const getStep = (value: string | number | undefined): number | string | undefined =>
  value ?? undefined;

export const getInputValue = (value: unknown): string => String(value ?? "");

export const getOptionKey = (
  option: unknown,
  index: number,
  prefix = ""
): string => {
  if (typeof option === "string") return \`\${prefix}\${option}\`;
  if (typeof option === "object" && option !== null) {
    const o = option as Record<string, unknown>;
    return \`\${prefix}\${o["value"] ?? o["label"] ?? index}\`;
  }
  return \`\${prefix}\${index}\`;
};

export const stringPropVisible = (
  value: string | undefined,
  show: boolean | string | undefined
): boolean => {
  if (!value) return false;
  if (show === undefined) return true;
  return getBoolean(show) !== false;
};

/** Notification role — always "alert" in RN (no live regions) */
export const getNotificationRole = (_semantic?: string): string => "alert";

export const isKeyboardEvent = <T>(_event: unknown): _event is React.KeyboardEvent<T> =>
  false;

export const addAttributeToChildren = (..._args: unknown[]): void => {};
`;

const RN_FORM_COMPONENTS_UTILS = `/** Stubs for web-only form framework helpers — no-ops in React Native */
export const addValueResetEventListener = (..._args: unknown[]): void => {};
export const addCheckedResetEventListener = (..._args: unknown[]): void => {};
export const addResetEventListener = (..._args: unknown[]): void => {};
export const handleFrameworkEventAngular = (..._args: unknown[]): void => {};
export const handleFrameworkEventVue = (..._args: unknown[]): void => {};
`;

const RN_SHARED_MODEL_PATCH = `
/* React Native event type aliases */
import type { GestureResponderEvent, NativeSyntheticEvent, TextInputChangeEventData } from "react-native";
export type ClickEvent<_T> = GestureResponderEvent;
export type ChangeEvent<_T> = NativeSyntheticEvent<TextInputChangeEventData>;
export type InputEvent<_T> = string;
export type InteractionEvent<_T> = GestureResponderEvent;
export type GeneralEvent<_T> = GestureResponderEvent;
export type GeneralKeyboardEvent<_T> = GestureResponderEvent;
`;

// ---------------------------------------------------------------------------
// Per-component manual implementations using Expo APIs
// ---------------------------------------------------------------------------

const COMPONENT_OVERRIDES: Record<string, string> = {

	/* ---- DBPage → SafeAreaView (expo-safe-area-context) + StatusBar ---- */
	'page/page.tsx': `import React, { forwardRef } from "react";
import { View, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { DBPageProps } from "./model";

function DBPageFn(props: DBPageProps, component: any) {
  return (
    <SafeAreaView style={styles.page} ref={component}>
      <StatusBar style="auto" />
      {props.header && <View style={styles.headerSlot}>{props.header}</View>}
      <View style={styles.main}>{props.children}</View>
      {props.footer && <View style={styles.footerSlot}>{props.footer}</View>}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  headerSlot: {},
  main: { flex: 1 },
  footerSlot: {}
});

const DBPage = forwardRef<View, DBPageProps>(DBPageFn);
export default DBPage;
`,

	/* ---- DBNavigation → expo-router Tabs ---- */
	'navigation/navigation.tsx': `import React from "react";
import { Tabs } from "expo-router";

export type DBNavigationExtraProps = {
  screenOptions?: React.ComponentProps<typeof Tabs>["screenOptions"];
  children?: React.ReactNode;
};

/**
 * DBNavigation renders as expo-router \`<Tabs>\` for top-level tab navigation.
 * Pass \`screenOptions\` to customise tab bar appearance (active colour, tabBarButton, etc.).
 * Children must be \`<DBNavigationItem>\` elements (which are direct aliases of Tabs.Screen
 * so expo-router can detect them correctly).
 */
function DBNavigation(props: DBNavigationExtraProps) {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarPosition: "top",
        tabBarIconStyle: { display: "none" },
        ...(props.screenOptions ?? {})
      }}
    >
      {props.children}
    </Tabs>
  );
}

export default DBNavigation;
`,

	/* ---- DBNavigationItem → direct alias of Tabs.Screen ---- */
	'navigation-item/navigation-item.tsx': `/**
 * DBNavigationItem is a direct alias of expo-router Tabs.Screen.
 * This is required because expo-router checks \`child.type === Tabs.Screen\`
 * at runtime — any wrapper component would be silently ignored.
 *
 * Usage:
 *   <DBNavigationItem name="my_screen" options={{ title: "My Screen" }} />
 *
 * Convenience props:
 *   label  — shorthand for options.title
 *   text   — shorthand for options.title (fallback)
 */
import { Tabs } from "expo-router";
import React from "react";

type DBNavigationItemProps = React.ComponentProps<typeof Tabs.Screen> & {
  /** Shorthand for options.title */
  label?: string;
  /** Shorthand for options.title (fallback) */
  text?: string;
};

function DBNavigationItem({ label, text, options, ...rest }: DBNavigationItemProps) {
  return (
    <Tabs.Screen
      {...rest}
      options={{
        title: label ?? text ?? options?.title ?? rest.name,
        ...options,
      }}
    />
  );
}

// Assign Tabs.Screen's displayName so expo-router's child-type check passes
(DBNavigationItem as any).displayName = (Tabs.Screen as any).displayName;

export default DBNavigationItem;
`,

	/* ---- DBIcon → @expo/vector-icons MaterialIcons ---- */
	'icon/icon.tsx': `import React, { forwardRef } from "react";
import { View, Text, StyleSheet } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { DBIconProps } from "./model";

/**
 * DBIcon wraps \`@expo/vector-icons\` MaterialIcons.
 * The \`icon\` prop is passed as the icon name. Non-matching names fall back to a Text placeholder.
 * The \`weight\` prop maps to icon size (16/20/24/32/48/64).
 */
function DBIconFn(props: DBIconProps, component: any) {
  const sizeMap: Record<string, number> = {
    "16": 16, "20": 20, "24": 24, "32": 32, "48": 48, "64": 64
  };
  const size = props.weight ? (sizeMap[props.weight] ?? 24) : 24;
  const iconName = props.icon as React.ComponentProps<typeof MaterialIcons>["name"] | undefined;

  if (!iconName) {
    return props.text ? (
      <Text ref={component} style={styles.text}>{props.text}</Text>
    ) : (
      <View ref={component}>{props.children}</View>
    );
  }

  return (
    <MaterialIcons
      name={iconName}
      size={size}
      style={styles.icon}
      accessibilityElementsHidden
    />
  );
}

const styles = StyleSheet.create({
  icon: {},
  text: { fontSize: 14 }
});

const DBIcon = forwardRef<View, DBIconProps>(DBIconFn);
export default DBIcon;
`,

	/* ---- DBLink → expo-linking ---- */
	'link/link.tsx': `import React, { forwardRef } from "react";
import { Text, TouchableOpacity, StyleSheet } from "react-native";
import * as Linking from "expo-linking";
import { DBLinkProps } from "./model";

function DBLinkFn(props: DBLinkProps, component: any) {
  async function handlePress() {
    if (props.href) {
      const canOpen = await Linking.canOpenURL(props.href);
      if (canOpen) await Linking.openURL(props.href);
    }
    if (props.onClick) (props.onClick as any)();
  }

  return (
    <TouchableOpacity
      ref={component}
      onPress={handlePress}
      disabled={Boolean(props.disabled)}
      accessibilityRole="link"
      accessibilityLabel={props.text ?? String(props.children ?? "")}
    >
      <Text style={[styles.link, Boolean(props.disabled) && styles.disabled]}>
        {props.text ?? props.children}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  link: { color: "#0070cc", textDecorationLine: "underline" },
  disabled: { color: "#aaa", textDecorationLine: "none" }
});

const DBLink = forwardRef<TouchableOpacity, DBLinkProps>(DBLinkFn);
export default DBLink;
`,

	/* ---- DBButton → TouchableOpacity + expo-haptics ---- */
	'button/button.tsx': `import React, { forwardRef } from "react";
import { TouchableOpacity, Text, View, StyleSheet } from "react-native";
import * as Haptics from "expo-haptics";
import { DBButtonProps } from "./model";

function DBButtonFn(props: DBButtonProps, component: any) {
  async function handlePress(event: any) {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (props.onClick) (props.onClick as any)(event);
  }

  const label = props.text ?? props.children;

  return (
    <TouchableOpacity
      ref={component}
      onPress={handlePress}
      disabled={Boolean(props.disabled)}
      accessibilityRole="button"
      accessibilityLabel={typeof label === "string" ? label : undefined}
      accessibilityState={{ disabled: Boolean(props.disabled) }}
      style={[
        styles.button,
        props.variant === "filled" && styles.filled,
        props.variant === "ghost" && styles.ghost,
        props.variant === "brand" && styles.brand,
        Boolean(props.disabled) && styles.buttonDisabled,
        props.width === "full" && styles.fullWidth
      ]}
    >
      {typeof label === "string" ? (
        <Text style={[styles.label, Boolean(props.disabled) && styles.labelDisabled]}>
          {label}
        </Text>
      ) : (
        label
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#333",
    backgroundColor: "transparent"
  },
  filled: { backgroundColor: "#333", borderColor: "#333" },
  ghost: { borderColor: "transparent" },
  brand: { backgroundColor: "#ec0016", borderColor: "#ec0016" },
  buttonDisabled: { opacity: 0.4 },
  fullWidth: { width: "100%" },
  label: { fontSize: 14, color: "#333", fontWeight: "500" },
  labelDisabled: { color: "#aaa" }
});

const DBButton = forwardRef<View, DBButtonProps>(DBButtonFn);
export default DBButton;
`,

	/* ---- DBCustomButton → Pressable + expo-haptics ---- */
	'custom-button/custom-button.tsx': `import React, { forwardRef } from "react";
import { Pressable, View, StyleSheet } from "react-native";
import * as Haptics from "expo-haptics";
import { DBCustomButtonProps } from "./model";

function DBCustomButtonFn(props: DBCustomButtonProps, component: any) {
  async function handlePress(event: any) {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (props.onClick) (props.onClick as any)(event);
  }

  return (
    <Pressable
      ref={component}
      onPress={handlePress}
      disabled={Boolean(props.disabled)}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
      accessibilityRole="button"
    >
      {props.children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 4
  },
  pressed: { opacity: 0.7 }
});

const DBCustomButton = forwardRef<View, DBCustomButtonProps>(DBCustomButtonFn);
export default DBCustomButton;
`,

	/* ---- DBHeader → SafeAreaView + expo-router Drawer trigger ---- */
	'header/header.tsx': `import React, { forwardRef } from "react";
import { View, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import DBButton from "../button/button";
import DBDrawer from "../drawer/drawer";
import { getBoolean } from "../../utils";
import { DBHeaderProps } from "./model";

function DBHeaderFn(props: DBHeaderProps, component: any) {
  function handleToggle() {
    const open = !Boolean(props.drawerOpen);
    if (props.onToggle) props.onToggle(open);
  }

  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      <View style={styles.header} ref={component}>
        {props.brand && <View style={styles.brand}>{props.brand}</View>}
        <View style={styles.navContainer}>{props.children}</View>
        <View style={styles.actions}>
          {props.primaryAction}
          {props.secondaryAction}
          <DBButton variant="ghost" noText icon="menu" onPress={handleToggle}>
            {props.burgerMenuLabel ?? "Menu"}
          </DBButton>
        </View>
      </View>
      <DBDrawer
        open={Boolean(props.drawerOpen)}
        onClose={handleToggle}
        closeButtonText={props.closeButtonText}
      >
        <View>{props.children}</View>
        {props.metaNavigation && <View>{props.metaNavigation}</View>}
      </DBDrawer>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: "#fff" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#ccc"
  },
  brand: { marginRight: 16 },
  navContainer: { flex: 1 },
  actions: { flexDirection: "row", alignItems: "center", gap: 8 }
});

const DBHeader = forwardRef<View, DBHeaderProps>(DBHeaderFn);
export default DBHeader;
`,

	/* ---- DBDrawer → Modal + react-native-reanimated slide ---- */
	'drawer/drawer.tsx': `import React, { forwardRef, useEffect } from "react";
import {
  Modal,
  View,
  TouchableOpacity,
  Text,
  ScrollView,
  StyleSheet
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing
} from "react-native-reanimated";
import { DBDrawerProps } from "./model";

const DURATION = 260;

function DBDrawerFn(props: DBDrawerProps, component: any) {
  const isOpen = Boolean(props.open);
  const translateX = useSharedValue(isOpen ? 0 : -320);

  useEffect(() => {
    translateX.value = withTiming(isOpen ? 0 : -320, {
      duration: DURATION,
      easing: Easing.out(Easing.cubic)
    });
  }, [isOpen]);

  const direction = props.direction ?? "left";
  const isVertical = direction === "top" || direction === "bottom";

  const animatedStyle = useAnimatedStyle(() => ({
    transform: isVertical
      ? [{ translateY: translateX.value }]
      : [{ translateX: translateX.value }]
  }));

  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="none"
      onRequestClose={() => props.onClose?.()}
    >
      <View style={styles.overlay} ref={component}>
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={() => props.backdrop !== "none" && props.onClose?.()}
        />
        <Animated.View style={[styles.drawer, animatedStyle]}>
          <View style={styles.drawerHeader}>
            <TouchableOpacity
              onPress={() => props.onClose?.()}
              accessibilityLabel={props.closeButtonText ?? "Close"}
              accessibilityRole="button"
            >
              <Text style={styles.closeBtn}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.content}>{props.children}</ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, flexDirection: "row" },
  backdrop: {
    position: "absolute",
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: "rgba(0,0,0,0.4)"
  },
  drawer: {
    width: 320,
    backgroundColor: "#fff",
    flexDirection: "column",
    shadowColor: "#000",
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8
  },
  drawerHeader: {
    padding: 16,
    flexDirection: "row",
    justifyContent: "flex-end",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e0e0e0"
  },
  closeBtn: { fontSize: 20, color: "#333" },
  content: { flex: 1, padding: 16 }
});

const DBDrawer = forwardRef<View, DBDrawerProps>(DBDrawerFn);
export default DBDrawer;
`,

	/* ---- DBTooltip → expo-blur backdrop ---- */
	'tooltip/tooltip.tsx': `import React, { forwardRef, useState, useRef } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet
} from "react-native";
import { BlurView } from "expo-blur";
import { DBTooltipProps } from "./model";

function DBTooltipFn(props: DBTooltipProps, component: any) {
  const [visible, setVisible] = useState(false);
  const triggerRef = useRef<View>(null);
  const [pos, setPos] = useState({ x: 0, y: 0, width: 0, height: 0 });

  function handlePress() {
    if (triggerRef.current) {
      (triggerRef.current as any).measure(
        (_fx: number, _fy: number, w: number, h: number, px: number, py: number) => {
          setPos({ x: px, y: py, width: w, height: h });
          setVisible(true);
        }
      );
    } else {
      setVisible(true);
    }
  }

  return (
    <View style={styles.container} ref={component}>
      <TouchableOpacity ref={triggerRef} onPress={handlePress}>
        {props.children}
      </TouchableOpacity>
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={() => setVisible(false)}
      >
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={() => setVisible(false)}
        >
          <View
            style={[
              styles.tooltip,
              { top: pos.y + pos.height + 8, left: pos.x }
            ]}
          >
            <Text style={styles.tooltipText}>
              {props.tooltipText ?? props.children}
            </Text>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {},
  tooltip: {
    position: "absolute",
    backgroundColor: "#333",
    borderRadius: 6,
    padding: 10,
    maxWidth: 220,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4
  },
  tooltipText: { color: "#fff", fontSize: 13, lineHeight: 18 }
});

const DBTooltip = forwardRef<View, DBTooltipProps>(DBTooltipFn);
export default DBTooltip;
`,

	/* ---- DBPopover → expo-blur backdrop ---- */
	'popover/popover.tsx': `import React, { forwardRef, useState, useEffect } from "react";
import {
  Modal,
  View,
  TouchableOpacity,
  ScrollView,
  StyleSheet
} from "react-native";
import { BlurView } from "expo-blur";
import { DBPopoverProps } from "./model";

function DBPopoverFn(props: DBPopoverProps, component: any) {
  const [visible, setVisible] = useState(Boolean(props.open));

  useEffect(() => {
    setVisible(Boolean(props.open));
  }, [props.open]);

  function handleClose() {
    setVisible(false);
    props.onClose?.();
  }

  return (
    <View ref={component}>
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={handleClose}
      >
        <BlurView intensity={20} style={StyleSheet.absoluteFill}>
          <TouchableOpacity
            style={styles.backdrop}
            activeOpacity={1}
            onPress={handleClose}
          >
            <View style={styles.popover}>
              <ScrollView>{props.children}</ScrollView>
            </View>
          </TouchableOpacity>
        </BlurView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center"
  },
  popover: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    maxWidth: 320,
    maxHeight: "70%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6
  }
});

const DBPopover = forwardRef<View, DBPopoverProps>(DBPopoverFn);
export default DBPopover;
`,

	/* ---- DBAccordion → react-native-reanimated ---- */
	'accordion/accordion.tsx': `import React, { forwardRef, useState, useId } from "react";
import { View, StyleSheet } from "react-native";
import DBAccordionItem from "../accordion-item/accordion-item";
import { DBAccordionItemDefaultProps } from "../accordion-item/model";
import { DBAccordionProps } from "./model";

function DBAccordionFn(props: DBAccordionProps, component: any) {
  const uuid = useId();
  const name = props.name ?? \`acc-\${uuid}\`;
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  function convertItems(): DBAccordionItemDefaultProps[] {
    try {
      if (typeof props.items === "string") return JSON.parse(props.items);
      return (props.items as DBAccordionItemDefaultProps[]) ?? [];
    } catch { return []; }
  }

  const items = convertItems();

  function handleToggle(index: number) {
    setOpenIndex((prev) => {
      const next = prev === index ? null : index;
      return next;
    });
  }

  return (
    <View style={styles.container} ref={component}>
      {items.length > 0
        ? items.map((item, i) => (
            <DBAccordionItem
              key={\`\${name}-\${i}\`}
              open={props.behavior === "single" ? openIndex === i : item.open}
              onToggle={() => handleToggle(i)}
              {...item}
            />
          ))
        : props.children}
    </View>
  );
}

const styles = StyleSheet.create({ container: {} });

const DBAccordion = forwardRef<View, DBAccordionProps>(DBAccordionFn);
export default DBAccordion;
`,

	/* ---- DBAccordionItem → react-native-reanimated ---- */
	'accordion-item/accordion-item.tsx': `import React, { forwardRef, useState, useEffect } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing
} from "react-native-reanimated";
import { DBAccordionItemProps } from "./model";

function DBAccordionItemFn(props: DBAccordionItemProps & {
  onToggle?: () => void;
}, component: any) {
  const [open, setOpen] = useState(Boolean(props.open));
  const height = useSharedValue(open ? 1 : 0);

  useEffect(() => {
    const next = Boolean(props.open);
    setOpen(next);
    height.value = withTiming(next ? 1 : 0, {
      duration: 220,
      easing: Easing.out(Easing.quad)
    });
  }, [props.open]);

  function handlePress() {
    const next = !open;
    setOpen(next);
    height.value = withTiming(next ? 1 : 0, {
      duration: 220,
      easing: Easing.out(Easing.quad)
    });
    if (props.onToggle) props.onToggle();
    if (props.onOpen && next) (props.onOpen as any)();
    if (props.onClose && !next) (props.onClose as any)();
  }

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: height.value,
    maxHeight: height.value * 2000
  }));

  return (
    <View style={styles.container} ref={component}>
      <Pressable
        style={styles.header}
        onPress={handlePress}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
      >
        <Text style={styles.title}>{props.title ?? props.label}</Text>
        <Text style={styles.chevron}>{open ? "▴" : "▾"}</Text>
      </Pressable>
      <Animated.View style={[styles.body, animatedStyle]}>
        <View style={styles.bodyInner}>
          {props.content
            ? <Text>{props.content}</Text>
            : props.children}
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#ccc"
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 16
  },
  title: { fontSize: 15, fontWeight: "500", flex: 1 },
  chevron: { fontSize: 12, color: "#555" },
  body: { overflow: "hidden" },
  bodyInner: { paddingHorizontal: 16, paddingBottom: 14 }
});

const DBAccordionItem = forwardRef<View, DBAccordionItemProps & { onToggle?: () => void }>(DBAccordionItemFn);
export default DBAccordionItem;
`,

	/* ---- DBTabs → expo-router Tabs (same as navigation) ---- */
	'tabs/tabs.tsx': `import React, { forwardRef, useState, useId } from "react";
import { View, ScrollView, TouchableOpacity, Text, StyleSheet } from "react-native";
import * as Haptics from "expo-haptics";
import { DBSimpleTabProps, DBTabsProps } from "./model";

function DBTabsFn(props: DBTabsProps, component: any) {
  const uuid = useId();
  const [selectedIndex, setSelectedIndex] = useState(0);

  const tabs: DBSimpleTabProps[] = (() => {
    try {
      if (typeof props.tabs === "string") return JSON.parse(props.tabs);
      return (props.tabs as DBSimpleTabProps[]) ?? [];
    } catch { return []; }
  })();

  const isHorizontal = !props.orientation || props.orientation === "horizontal";

  async function handleTabPress(index: number) {
    await Haptics.selectionAsync();
    setSelectedIndex(index);
    if (props.onIndexChange) props.onIndexChange(index);
    if (props.onTabSelect) (props.onTabSelect as any)(index);
  }

  return (
    <View style={styles.container} ref={component}>
      <ScrollView
        horizontal={isHorizontal}
        style={isHorizontal ? styles.tabBarH : styles.tabBarV}
        showsHorizontalScrollIndicator={false}
      >
        {tabs.map((tab, index) => (
          <TouchableOpacity
            key={String(props.name ?? uuid) + index}
            style={[
              styles.tab,
              selectedIndex === index && styles.tabActive
            ]}
            onPress={() => handleTabPress(index)}
            accessibilityRole="tab"
            accessibilityState={{ selected: selectedIndex === index }}
          >
            <Text style={[styles.tabText, selectedIndex === index && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
        {props.children}
      </ScrollView>
      {tabs[selectedIndex] && (
        <View style={styles.panel}>
          {tabs[selectedIndex].content
            ? <Text>{tabs[selectedIndex].content}</Text>
            : tabs[selectedIndex].children}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  tabBarH: { flexDirection: "row", borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#ccc" },
  tabBarV: { flexDirection: "column", borderRightWidth: StyleSheet.hairlineWidth, borderRightColor: "#ccc" },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: "transparent"
  },
  tabActive: { borderBottomColor: "#333" },
  tabText: { fontSize: 14, color: "#666" },
  tabTextActive: { color: "#333", fontWeight: "600" },
  panel: { flex: 1, padding: 12 }
});

const DBTabs = forwardRef<View, DBTabsProps>(DBTabsFn);
export default DBTabs;
`,

	/* ---- DBSwitch → RN Switch (built-in) ---- */
	'switch/switch.tsx': `import React, { forwardRef, useState, useId } from "react";
import { View, Text, Switch as RNSwitch, StyleSheet } from "react-native";
import DBInfotext from "../infotext/infotext";
import { DEFAULT_VALID_MESSAGE } from "../../shared/constants";
import { stringPropVisible } from "../../utils";
import { DBSwitchProps } from "./model";

function DBSwitchFn(props: DBSwitchProps, component: any) {
  const uuid = useId();

  function hasValidState() {
    return !!(props.validMessage ?? props.validation === "valid");
  }

  return (
    <View style={styles.container} ref={component}>
      <View style={styles.row}>
        {(props.label || props.children) && (
          <Text style={styles.label}>{props.label ?? props.children}</Text>
        )}
        <RNSwitch
          value={Boolean(props.checked)}
          onValueChange={(val) => {
            if (props.onChange) (props.onChange as any)(val);
          }}
          disabled={Boolean(props.disabled)}
          accessibilityLabel={props.label ?? String(props.children ?? "")}
        />
      </View>
      {stringPropVisible(props.message, props.showMessage) && (
        <DBInfotext size="small" semantic="adaptive">{props.message}</DBInfotext>
      )}
      {hasValidState() && (
        <DBInfotext size="small" semantic="successful">
          {props.validMessage ?? DEFAULT_VALID_MESSAGE}
        </DBInfotext>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginVertical: 8 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  label: { flex: 1, fontSize: 14, color: "#333" }
});

const DBSwitch = forwardRef<View, DBSwitchProps>(DBSwitchFn);
export default DBSwitch;
`,

	/* ---- DBCheckbox → Pressable ---- */
	'checkbox/checkbox.tsx': `import React, { forwardRef, useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import DBInfotext from "../infotext/infotext";
import { DEFAULT_VALID_MESSAGE } from "../../shared/constants";
import { stringPropVisible } from "../../utils";
import { DBCheckboxProps } from "./model";

function DBCheckboxFn(props: DBCheckboxProps, component: any) {
  const [internal, setInternal] = useState(Boolean((props as any).defaultChecked));
  const checked = props.checked !== undefined ? Boolean(props.checked) : internal;

  function handlePress() {
    if (Boolean(props.disabled)) return;
    const next = !checked;
    setInternal(next);
    if (props.onChange) (props.onChange as any)(next);
  }

  return (
    <View style={styles.container} ref={component}>
      <Pressable
        style={styles.row}
        onPress={handlePress}
        disabled={Boolean(props.disabled)}
        accessibilityRole="checkbox"
        accessibilityState={{ checked, disabled: Boolean(props.disabled) }}
      >
        <View style={[styles.box, checked && styles.boxChecked, Boolean(props.disabled) && styles.boxDisabled]}>
          {checked && <Text style={styles.tick}>✓</Text>}
        </View>
        {(props.label || props.children) && (
          <Text style={[styles.label, Boolean(props.disabled) && styles.labelDisabled]}>
            {props.label ?? props.children}
          </Text>
        )}
      </Pressable>
      {stringPropVisible(props.message, props.showMessage) && (
        <DBInfotext size="small" semantic="adaptive">{props.message}</DBInfotext>
      )}
      {(props.validMessage ?? props.validation === "valid") && (
        <DBInfotext size="small" semantic="successful">
          {props.validMessage ?? DEFAULT_VALID_MESSAGE}
        </DBInfotext>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginVertical: 4 },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  box: { width: 20, height: 20, borderWidth: 2, borderColor: "#333", borderRadius: 3, alignItems: "center", justifyContent: "center" },
  boxChecked: { backgroundColor: "#333" },
  boxDisabled: { borderColor: "#aaa", backgroundColor: "#f0f0f0" },
  tick: { color: "#fff", fontSize: 13, fontWeight: "bold" },
  label: { fontSize: 14, color: "#333", flex: 1 },
  labelDisabled: { color: "#aaa" }
});

const DBCheckbox = forwardRef<View, DBCheckboxProps>(DBCheckboxFn);
export default DBCheckbox;
`,

	/* ---- DBRadio → Pressable ---- */
	'radio/radio.tsx': `import React, { forwardRef } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import DBInfotext from "../infotext/infotext";
import { DEFAULT_VALID_MESSAGE } from "../../shared/constants";
import { stringPropVisible } from "../../utils";
import { DBRadioProps } from "./model";

function DBRadioFn(props: DBRadioProps, component: any) {
  const checked = Boolean(props.checked);

  function handlePress() {
    if (Boolean(props.disabled)) return;
    if (props.onChange) (props.onChange as any)(true);
  }

  return (
    <View style={styles.container} ref={component}>
      <Pressable
        style={styles.row}
        onPress={handlePress}
        disabled={Boolean(props.disabled)}
        accessibilityRole="radio"
        accessibilityState={{ checked, disabled: Boolean(props.disabled) }}
      >
        <View style={[styles.outer, Boolean(props.disabled) && styles.outerDisabled]}>
          {checked && <View style={styles.inner} />}
        </View>
        {(props.label || props.children) && (
          <Text style={[styles.label, Boolean(props.disabled) && styles.labelDisabled]}>
            {props.label ?? props.children}
          </Text>
        )}
      </Pressable>
      {stringPropVisible(props.message, props.showMessage) && (
        <DBInfotext size="small" semantic="adaptive">{props.message}</DBInfotext>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginVertical: 4 },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  outer: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: "#333", alignItems: "center", justifyContent: "center" },
  outerDisabled: { borderColor: "#aaa" },
  inner: { width: 10, height: 10, borderRadius: 5, backgroundColor: "#333" },
  label: { fontSize: 14, color: "#333", flex: 1 },
  labelDisabled: { color: "#aaa" }
});

const DBRadio = forwardRef<View, DBRadioProps>(DBRadioFn);
export default DBRadio;
`,

	/* ---- DBSelect → Modal picker ---- */
	'select/select.tsx': `import React, { forwardRef, useState, useId } from "react";
import { View, Text, Pressable, Modal, FlatList, TouchableOpacity, StyleSheet } from "react-native";
import * as Haptics from "expo-haptics";
import DBInfotext from "../infotext/infotext";
import { DEFAULT_VALID_MESSAGE, DEFAULT_INVALID_MESSAGE } from "../../shared/constants";
import { stringPropVisible } from "../../utils";
import { DBSelectOptionType, DBSelectProps } from "./model";

function DBSelectFn(props: DBSelectProps, component: any) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(String(props.value ?? ""));

  const options: DBSelectOptionType[] = Array.isArray(props.options) ? props.options : [];
  const selectedLabel = options.find((o) =>
    typeof o === "string" ? o === selected : (o as any).value === selected
  );
  const display =
    typeof selectedLabel === "string"
      ? selectedLabel
      : (selectedLabel as any)?.label ?? selected ?? props.placeholder ?? "";

  async function handleSelect(option: DBSelectOptionType) {
    await Haptics.selectionAsync();
    const val = typeof option === "string" ? option : (option as any).value ?? "";
    setSelected(val);
    setOpen(false);
    if (props.onChange) (props.onChange as any)(val);
  }

  return (
    <View style={styles.container} ref={component}>
      {props.label && <Text style={styles.label}>{props.label}</Text>}
      <Pressable
        style={[styles.trigger, Boolean(props.disabled) && styles.triggerDisabled]}
        onPress={() => !Boolean(props.disabled) && setOpen(true)}
        accessibilityRole="combobox"
        accessibilityState={{ expanded: open, disabled: Boolean(props.disabled) }}
      >
        <Text style={styles.triggerText}>{display}</Text>
        <Text style={styles.arrow}>▾</Text>
      </Pressable>
      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={() => setOpen(false)}>
          <View style={styles.sheet}>
            <FlatList
              data={options}
              keyExtractor={(item, i) => typeof item === "string" ? item : ((item as any).value ?? String(i))}
              renderItem={({ item }) => {
                const val = typeof item === "string" ? item : (item as any).value ?? "";
                const lbl = typeof item === "string" ? item : (item as any).label ?? val;
                return (
                  <TouchableOpacity
                    style={[styles.option, val === selected && styles.optionSelected]}
                    onPress={() => handleSelect(item)}
                  >
                    <Text style={[styles.optionText, val === selected && styles.optionTextSelected]}>{lbl}</Text>
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </TouchableOpacity>
      </Modal>
      {stringPropVisible(props.message, props.showMessage) && (
        <DBInfotext size="small" semantic="adaptive">{props.message}</DBInfotext>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginVertical: 4 },
  label: { fontSize: 12, color: "#555", marginBottom: 4 },
  trigger: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: "#333", borderRadius: 4, padding: 10, backgroundColor: "#fff" },
  triggerDisabled: { borderColor: "#aaa", backgroundColor: "#f5f5f5" },
  triggerText: { flex: 1, fontSize: 14, color: "#333" },
  arrow: { fontSize: 14, color: "#555" },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.3)", justifyContent: "flex-end" },
  sheet: { backgroundColor: "#fff", borderTopLeftRadius: 12, borderTopRightRadius: 12, maxHeight: "50%", padding: 8 },
  option: { padding: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#f0f0f0" },
  optionSelected: { backgroundColor: "#f0f0ff" },
  optionText: { fontSize: 15, color: "#333" },
  optionTextSelected: { fontWeight: "bold" }
});

const DBSelect = forwardRef<View, DBSelectProps>(DBSelectFn);
export default DBSelect;
`,

	/* ---- DBInput → TextInput ---- */
	'input/input.tsx': `import React, { forwardRef, useState, useEffect } from "react";
import { View, Text, TextInput as RNTextInput, StyleSheet } from "react-native";
import DBInfotext from "../infotext/infotext";
import { DEFAULT_INVALID_MESSAGE, DEFAULT_VALID_MESSAGE } from "../../shared/constants";
import { stringPropVisible } from "../../utils";
import { DBInputProps } from "./model";

function DBInputFn(props: DBInputProps, component: any) {
  const [value, setValue] = useState(String(props.value ?? ""));
  const [focused, setFocused] = useState(false);
  const isInvalid = props.validation === "invalid";
  const isValid = !!(props.validMessage ?? props.validation === "valid") && props.validation === "valid";

  useEffect(() => { setValue(String(props.value ?? "")); }, [props.value]);

  return (
    <View style={styles.container} ref={component}>
      {props.label && (
        <Text style={styles.label}>
          {props.label}{props.required && <Text style={styles.required}> *</Text>}
        </Text>
      )}
      <RNTextInput
        style={[styles.input, focused && styles.focused, isInvalid && styles.invalid, isValid && styles.valid, Boolean(props.disabled) && styles.disabled]}
        value={value}
        onChangeText={(t) => { setValue(t); if (props.onChange) (props.onChange as any)(t); }}
        placeholder={String(props.placeholder ?? "")}
        editable={!Boolean(props.disabled)}
        secureTextEntry={props.type === "password"}
        keyboardType={props.type === "email" ? "email-address" : props.type === "number" || props.type === "tel" ? "numeric" : "default"}
        maxLength={typeof props.maxLength === "number" ? props.maxLength : undefined}
        accessibilityLabel={props.label ?? props.placeholder}
        onFocus={() => { setFocused(true); if (props.onFocus) (props.onFocus as any)(); }}
        onBlur={() => { setFocused(false); if (props.onBlur) (props.onBlur as any)(); }}
      />
      {props.description && <Text style={styles.description}>{props.description}</Text>}
      {stringPropVisible(props.message, props.showMessage) && (
        <DBInfotext size="small" semantic="adaptive">{props.message}</DBInfotext>
      )}
      {isValid && <DBInfotext size="small" semantic="successful">{props.validMessage ?? DEFAULT_VALID_MESSAGE}</DBInfotext>}
      {isInvalid && <DBInfotext size="small" semantic="critical">{props.invalidMessage ?? DEFAULT_INVALID_MESSAGE}</DBInfotext>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginVertical: 4 },
  label: { fontSize: 12, color: "#555", marginBottom: 4 },
  required: { color: "#c00" },
  input: { borderWidth: 1, borderColor: "#333", borderRadius: 4, padding: 10, fontSize: 14, backgroundColor: "#fff", color: "#333" },
  focused: { borderColor: "#0070cc", borderWidth: 2 },
  invalid: { borderColor: "#c00" },
  valid: { borderColor: "#090" },
  disabled: { borderColor: "#aaa", backgroundColor: "#f5f5f5", color: "#aaa" },
  description: { fontSize: 12, color: "#777", marginTop: 4 }
});

const DBInput = forwardRef<RNTextInput, DBInputProps>(DBInputFn);
export default DBInput;
`,

	/* ---- DBTextarea → TextInput multiline ---- */
	'textarea/textarea.tsx': `import React, { forwardRef, useState, useEffect } from "react";
import { View, Text, TextInput as RNTextInput, StyleSheet } from "react-native";
import DBInfotext from "../infotext/infotext";
import { DEFAULT_INVALID_MESSAGE, DEFAULT_VALID_MESSAGE } from "../../shared/constants";
import { stringPropVisible } from "../../utils";
import { DBTextareaProps } from "./model";

function DBTextareaFn(props: DBTextareaProps, component: any) {
  const [value, setValue] = useState(String(props.value ?? ""));
  const isInvalid = props.validation === "invalid";
  const isValid = !!(props.validMessage ?? props.validation === "valid") && props.validation === "valid";

  useEffect(() => { setValue(String(props.value ?? "")); }, [props.value]);

  return (
    <View style={styles.container} ref={component}>
      {props.label && (
        <Text style={styles.label}>
          {props.label}{props.required && <Text style={styles.required}> *</Text>}
        </Text>
      )}
      <RNTextInput
        style={[styles.input, isInvalid && styles.invalid, isValid && styles.valid, Boolean(props.disabled) && styles.disabled]}
        value={value}
        onChangeText={(t) => { setValue(t); if (props.onChange) (props.onChange as any)(t); }}
        placeholder={String(props.placeholder ?? "")}
        editable={!Boolean(props.disabled)}
        multiline
        numberOfLines={typeof props.rows === "number" ? props.rows : 4}
        textAlignVertical="top"
        maxLength={typeof props.maxLength === "number" ? props.maxLength : undefined}
        accessibilityLabel={props.label ?? props.placeholder}
      />
      {stringPropVisible(props.message, props.showMessage) && (
        <DBInfotext size="small" semantic="adaptive">{props.message}</DBInfotext>
      )}
      {isValid && <DBInfotext size="small" semantic="successful">{props.validMessage ?? DEFAULT_VALID_MESSAGE}</DBInfotext>}
      {isInvalid && <DBInfotext size="small" semantic="critical">{props.invalidMessage ?? DEFAULT_INVALID_MESSAGE}</DBInfotext>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginVertical: 4 },
  label: { fontSize: 12, color: "#555", marginBottom: 4 },
  required: { color: "#c00" },
  input: { borderWidth: 1, borderColor: "#333", borderRadius: 4, padding: 10, fontSize: 14, backgroundColor: "#fff", color: "#333", minHeight: 80 },
  invalid: { borderColor: "#c00" },
  valid: { borderColor: "#090" },
  disabled: { borderColor: "#aaa", backgroundColor: "#f5f5f5", color: "#aaa" }
});

const DBTextarea = forwardRef<RNTextInput, DBTextareaProps>(DBTextareaFn);
export default DBTextarea;
`,

	/* ---- DBCustomSelect → Modal multi-select picker ---- */
	'custom-select/custom-select.tsx': `import React, { forwardRef, useState } from "react";
import { View, Text, Pressable, Modal, FlatList, TouchableOpacity, StyleSheet } from "react-native";
import * as Haptics from "expo-haptics";
import { DBCustomSelectProps } from "./model";

function DBCustomSelectFn(props: DBCustomSelectProps, component: any) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>(
    Array.isArray(props.values) ? props.values as string[] : props.values ? [props.values as string] : []
  );
  const options = Array.isArray(props.options) ? props.options : [];
  const display = selected.length ? selected.join(", ") : props.placeholder ?? "Select...";

  async function handleSelect(val: string) {
    await Haptics.selectionAsync();
    let next: string[];
    if (props.multiple) {
      next = selected.includes(val) ? selected.filter((v) => v !== val) : [...selected, val];
    } else {
      next = [val];
      setOpen(false);
    }
    setSelected(next);
    if (props.onValueChange) props.onValueChange(next.join(","));
    if (props.onOptionSelected) (props.onOptionSelected as any)(val);
  }

  return (
    <View style={styles.container} ref={component}>
      {props.label && <Text style={styles.label}>{props.label}</Text>}
      <Pressable
        style={[styles.trigger, Boolean(props.disabled) && styles.triggerDisabled]}
        onPress={() => !Boolean(props.disabled) && setOpen(true)}
        accessibilityRole="combobox"
        accessibilityState={{ expanded: open }}
      >
        <Text style={styles.triggerText}>{display}</Text>
        <Text style={styles.arrow}>{open ? "▴" : "▾"}</Text>
      </Pressable>
      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={() => setOpen(false)}>
          <View style={styles.sheet}>
            <FlatList
              data={options}
              keyExtractor={(item, i) => {
                const v = typeof item === "object" && item !== null ? String((item as any).value ?? i) : String(item ?? i);
                return v;
              }}
              renderItem={({ item }) => {
                const val = typeof item === "object" && item !== null ? String((item as any).value ?? "") : String(item ?? "");
                const lbl = typeof item === "object" && item !== null ? String((item as any).label ?? val) : val;
                const isSel = selected.includes(val);
                return (
                  <TouchableOpacity style={[styles.option, isSel && styles.optionSelected]} onPress={() => handleSelect(val)}>
                    {props.multiple && (
                      <View style={[styles.check, isSel && styles.checkSelected]}>
                        {isSel && <Text style={styles.checkMark}>✓</Text>}
                      </View>
                    )}
                    <Text style={[styles.optionText, isSel && styles.optionTextSelected]}>{lbl}</Text>
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </TouchableOpacity>
      </Modal>
      {props.children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginVertical: 4 },
  label: { fontSize: 12, color: "#555", marginBottom: 4 },
  trigger: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: "#333", borderRadius: 4, padding: 10, backgroundColor: "#fff" },
  triggerDisabled: { borderColor: "#aaa", backgroundColor: "#f5f5f5" },
  triggerText: { flex: 1, fontSize: 14, color: "#333" },
  arrow: { fontSize: 14, color: "#555" },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.3)", justifyContent: "flex-end" },
  sheet: { backgroundColor: "#fff", borderTopLeftRadius: 12, borderTopRightRadius: 12, maxHeight: "60%", padding: 8 },
  option: { flexDirection: "row", alignItems: "center", padding: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#f0f0f0" },
  optionSelected: { backgroundColor: "#f0f0ff" },
  optionText: { fontSize: 15, color: "#333", flex: 1 },
  optionTextSelected: { fontWeight: "bold" },
  check: { width: 20, height: 20, borderWidth: 2, borderColor: "#333", borderRadius: 3, alignItems: "center", justifyContent: "center", marginRight: 10 },
  checkSelected: { backgroundColor: "#333" },
  checkMark: { color: "#fff", fontSize: 12, fontWeight: "bold" }
});

const DBCustomSelect = forwardRef<View, DBCustomSelectProps>(DBCustomSelectFn);
export default DBCustomSelect;
`
};

// ---------------------------------------------------------------------------
// Additional overrides for auto-generated components needing cleanup
// ---------------------------------------------------------------------------

const AUTO_COMPONENT_OVERRIDES: Record<string, string> = {
  'badge/badge.tsx': `import React from "react";
import { View, Text, StyleSheet } from "react-native";
import type { DBBadgeProps } from "./model";

function DBBadge(props: DBBadgeProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>{props.text ?? props.children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#c0392b",
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    alignSelf: "flex-start",
  },
  text: { color: "#fff", fontSize: 11, fontWeight: "bold" },
});

export default DBBadge;
`,

  'brand/brand.tsx': `import React from "react";
import { View, Text, StyleSheet } from "react-native";
import type { DBBrandProps } from "./model";

function DBBrand(props: DBBrandProps) {
  return (
    <View style={styles.container}>
      {props.text ? (
        <Text style={styles.text}>{props.text}</Text>
      ) : (
        props.children
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: "row", alignItems: "center", padding: 8 },
  text: { fontSize: 20, fontWeight: "bold" },
});

export default DBBrand;
`,

  'card/card.tsx': `import React from "react";
import { View, TouchableOpacity, StyleSheet } from "react-native";
import type { DBCardProps } from "./model";

function DBCard(props: DBCardProps) {
  if (props.onClick) {
    return (
      <TouchableOpacity style={styles.card} onPress={props.onClick as any} activeOpacity={0.8}>
        {props.children}
      </TouchableOpacity>
    );
  }
  return <View style={styles.card}>{props.children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 16,
    marginVertical: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
});

export default DBCard;
`,

  'divider/divider.tsx': `import React from "react";
import { View, StyleSheet } from "react-native";
import type { DBDividerProps } from "./model";

function DBDivider(props: DBDividerProps) {
  const isVertical = props.orientation === "vertical";
  return (
    <View
      style={[
        styles.divider,
        isVertical ? styles.vertical : styles.horizontal,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  divider: { backgroundColor: "#e0e0e0" },
  horizontal: { height: 1, alignSelf: "stretch", marginVertical: 8 },
  vertical: { width: 1, alignSelf: "stretch", marginHorizontal: 8 },
});

export default DBDivider;
`,

  'infotext/infotext.tsx': `import React from "react";
import { View, Text, StyleSheet } from "react-native";
import type { DBInfotextProps } from "./model";

function DBInfotext(props: DBInfotextProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>{props.text ?? props.children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingVertical: 4 },
  text: { fontSize: 13, color: "#555" },
});

export default DBInfotext;
`,

  'notification/notification.tsx': `import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { stringPropVisible } from "../../utils";
import type { DBNotificationProps } from "./model";
import { DEFAULT_CLOSE_BUTTON } from "../../shared/constants";

function DBNotification(props: DBNotificationProps) {
  const [visible, setVisible] = useState(true);

  if (!visible) return null;

  return (
    <View style={styles.container} accessibilityRole="alert">
      {props.image ? <View style={styles.imageSlot}>{props.image as any}</View> : null}
      {stringPropVisible(props.headline, props.showHeadline) ? (
        <Text style={styles.headline}>{props.headline}</Text>
      ) : null}
      <Text style={styles.body}>{props.text ?? props.children}</Text>
      {stringPropVisible(props.timestamp, props.showTimestamp) ? (
        <Text style={styles.timestamp}>{props.timestamp}</Text>
      ) : null}
      {props.link ? <View>{props.link as any}</View> : null}
      {Boolean(props.closeable) ? (
        <TouchableOpacity
          style={styles.closeBtn}
          onPress={() => {
            setVisible(false);
            if (props.onClose) (props.onClose as any)();
          }}
          accessibilityLabel={props.closeButtonText ?? DEFAULT_CLOSE_BUTTON}
        >
          <Text style={styles.closeBtnText}>✕</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#fff",
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: "#0060a9",
    padding: 12,
    marginVertical: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  imageSlot: { marginBottom: 8 },
  headline: { fontSize: 16, fontWeight: "bold", marginBottom: 4, color: "#1a1a1a" },
  body: { fontSize: 14, color: "#333" },
  timestamp: { fontSize: 11, color: "#888", marginTop: 4 },
  closeBtn: { position: "absolute", top: 8, right: 8, padding: 4 },
  closeBtnText: { fontSize: 16, color: "#555" },
});

export default DBNotification;
`,

  'section/section.tsx': `import React from "react";
import { View, StyleSheet } from "react-native";
import type { DBSectionProps } from "./model";

function DBSection(props: DBSectionProps) {
  return <View style={styles.section}>{props.children}</View>;
}

const styles = StyleSheet.create({
  section: { paddingVertical: 8 },
});

export default DBSection;
`,

  'stack/stack.tsx': `import React from "react";
import { View, StyleSheet } from "react-native";
import type { DBStackProps } from "./model";

function DBStack(props: DBStackProps) {
  const isHorizontal = props.orientation === "horizontal";
  return (
    <View style={[styles.stack, isHorizontal ? styles.row : styles.column]}>
      {props.children}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { flexWrap: "wrap" },
  row: { flexDirection: "row", alignItems: "center" },
  column: { flexDirection: "column" },
});

export default DBStack;
`,

  'tag/tag.tsx': `import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { DEFAULT_REMOVE } from "../../shared/constants";
import type { DBTagProps } from "./model";

function DBTag(props: DBTagProps) {
  const removeLabel = props.removeButton ?? DEFAULT_REMOVE;
  return (
    <View style={styles.tag}>
      <Text style={styles.text}>{props.content ?? props.text ?? props.children}</Text>
      {props.behavior === "removable" ? (
        <TouchableOpacity
          style={styles.removeBtn}
          onPress={props.onRemove as any}
          accessibilityLabel={removeLabel}
        >
          <Text style={styles.removeBtnText}>✕</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  tag: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#e8f0fe",
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginRight: 4,
    marginBottom: 4,
    alignSelf: "flex-start",
  },
  text: { fontSize: 13, color: "#1a1a1a" },
  removeBtn: { marginLeft: 6, padding: 2 },
  removeBtnText: { fontSize: 12, color: "#555" },
});

export default DBTag;
`,

  'tab-list/tab-list.tsx': `import React from "react";
import { View, ScrollView, StyleSheet } from "react-native";
import type { DBTabListProps } from "./model";

function DBTabList(props: DBTabListProps) {
  return (
    <View style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scroll}>
        {props.children}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { borderBottomWidth: 1, borderBottomColor: "#e0e0e0" },
  scroll: { flexDirection: "row" },
});

export default DBTabList;
`,

  'tab-item/tab-item.tsx': `import React from "react";
import { TouchableOpacity, Text, StyleSheet } from "react-native";
import type { DBTabItemProps } from "./model";

function DBTabItem(props: DBTabItemProps) {
  const selected = Boolean(props.selected ?? props.active);
  return (
    <TouchableOpacity
      style={[styles.item, selected && styles.selected]}
      onPress={props.onSelect as any}
      accessibilityRole="tab"
      accessibilityState={{ selected }}
    >
      <Text style={[styles.label, selected && styles.labelSelected]}>
        {props.label ?? props.children}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  item: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
    marginRight: 4,
  },
  selected: { borderBottomColor: "#0060a9" },
  label: { fontSize: 14, color: "#555" },
  labelSelected: { color: "#0060a9", fontWeight: "bold" },
});

export default DBTabItem;
`,

  'tab-panel/tab-panel.tsx': `import React from "react";
import { View, StyleSheet } from "react-native";
import type { DBTabPanelProps } from "./model";

function DBTabPanel(props: DBTabPanelProps) {
  return (
    <View style={styles.panel} accessibilityRole="summary">
      {props.content ?? props.children}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { padding: 16 },
});

export default DBTabPanel;
`,

  'custom-select-dropdown/custom-select-dropdown.tsx': `import React from "react";
import { View, StyleSheet } from "react-native";
import type { DBCustomSelectDropdownProps } from "./model";

function DBCustomSelectDropdown(props: DBCustomSelectDropdownProps) {
  return <View style={styles.dropdown}>{props.children}</View>;
}

const styles = StyleSheet.create({
  dropdown: {
    position: "absolute",
    top: "100%" as any,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#ccc",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 1000,
  },
});

export default DBCustomSelectDropdown;
`,

  'custom-select-form-field/custom-select-form-field.tsx': `import React from "react";
import { View, StyleSheet } from "react-native";
import type { DBCustomSelectFormFieldProps } from "./model";

function DBCustomSelectFormField(props: DBCustomSelectFormFieldProps) {
  return <View style={styles.formField}>{props.children}</View>;
}

const styles = StyleSheet.create({
  formField: { flexDirection: "row", alignItems: "center", paddingVertical: 6 },
});

export default DBCustomSelectFormField;
`,

  'custom-select-list/custom-select-list.tsx': `import React from "react";
import { ScrollView, StyleSheet } from "react-native";
import type { DBCustomSelectListProps } from "./model";

function DBCustomSelectList(props: DBCustomSelectListProps) {
  return (
    <ScrollView style={styles.list} nestedScrollEnabled>
      {props.children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  list: { maxHeight: 240 },
});

export default DBCustomSelectList;
`,

  'custom-select-list-item/custom-select-list-item.tsx': `import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { getBoolean } from "../../utils";
import type { DBCustomSelectListItemProps } from "./model";

function DBCustomSelectListItem(props: DBCustomSelectListItemProps) {
  const selected = getBoolean(props.selected);
  const disabled = getBoolean(props.disabled);
  return (
    <TouchableOpacity
      style={[styles.item, selected && styles.selected, disabled && styles.disabled]}
      onPress={!disabled ? (props.onChange as any) : undefined}
      disabled={disabled}
      accessibilityRole="option"
      accessibilityState={{ selected, disabled }}
    >
      {props.type === "checkbox" ? (
        <View style={[styles.check, selected && styles.checkSelected]}>
          {selected ? <Text style={styles.checkMark}>✓</Text> : null}
        </View>
      ) : null}
      <Text style={[styles.label, disabled && styles.disabledText]}>
        {props.label ?? props.children}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  item: { flexDirection: "row", alignItems: "center", padding: 12, borderBottomWidth: 1, borderBottomColor: "#f0f0f0" },
  selected: { backgroundColor: "#e8f0fe" },
  disabled: { opacity: 0.4 },
  check: { width: 18, height: 18, borderWidth: 2, borderColor: "#555", borderRadius: 3, alignItems: "center", justifyContent: "center", marginRight: 10 },
  checkSelected: { backgroundColor: "#0060a9", borderColor: "#0060a9" },
  checkMark: { color: "#fff", fontSize: 11, fontWeight: "bold" },
  label: { fontSize: 14, color: "#222", flex: 1 },
  disabledText: { color: "#999" },
});

export default DBCustomSelectListItem;
`,
};

// Merge both override maps (COMPONENT_OVERRIDES takes precedence for manually overridden components)
const ALL_COMPONENT_OVERRIDES: Record<string, string> = {
  ...AUTO_COMPONENT_OVERRIDES,
  ...COMPONENT_OVERRIDES,
};

// ---------------------------------------------------------------------------
// Transform helpers
// ---------------------------------------------------------------------------

function transformFile(content: string): string {
	let result = content;
	for (const pattern of REMOVE_PATTERNS) result = result.replace(pattern, '');
	for (const [from, to] of REPLACEMENTS) {
		if (typeof from === 'string') {
			result = result.split(from).join(to as string);
		} else {
			result = result.replace(from, to as string);
		}
	}
	result = result.replace(/\n{3,}/g, '\n\n');
	return result;
}

function ensureDir(dir: string) {
	if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

function copyAndTransformDir(srcDir: string, destDir: string) {
	if (!existsSync(srcDir)) return;
	ensureDir(destDir);
	for (const entry of readdirSync(srcDir, { withFileTypes: true })) {
		const srcPath = join(srcDir, entry.name);
		const destPath = join(destDir, entry.name);
		if (entry.isDirectory()) {
			copyAndTransformDir(srcPath, destPath);
		} else if (entry.name.endsWith('.tsx') || entry.name.endsWith('.ts')) {
			const content = readFileSync(srcPath, 'utf-8');
			writeFileSync(destPath, transformFile(content), 'utf-8');
		}
	}
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

export default function reactNative(_tmp?: boolean) {
	try {
		console.log(`[RN] src:  ${TMP_SRC}`);
		console.log(`[RN] dest: ${RN_DEST}`);

		copyAndTransformDir(TMP_SRC, RN_DEST);

		// Overwrite shared utilities
		const utilsDir = join(RN_DEST, 'utils');
		ensureDir(utilsDir);
		writeFileSync(join(utilsDir, 'index.ts'), RN_UTILS, 'utf-8');
		writeFileSync(join(utilsDir, 'form-components.ts'), RN_FORM_COMPONENTS_UTILS, 'utf-8');

		// Patch shared model
		const modelPath = join(RN_DEST, 'shared', 'model.ts');
		if (existsSync(modelPath)) {
			let m = readFileSync(modelPath, 'utf-8');
			m = m.replace(`import * as React from "react";\n`, '');
			m = m
				.replace(/export type ClickEvent<T> = [^;]+;/, '')
				.replace(/export type ChangeEvent<T> = [^;]+;/, '')
				.replace(/export type InputEvent<T> = [^;]+;/, '')
				.replace(/export type InteractionEvent<T> = [^;]+;/, '')
				.replace(/export type GeneralEvent<T> = [^;]+;/, '')
				.replace(/export type GeneralKeyboardEvent<T> = [^;]+;/, '');
			m += RN_SHARED_MODEL_PATCH;
			writeFileSync(modelPath, m, 'utf-8');
		}

		// Stub out web-only utility files that leaked from the React output
		const webOnlyStubs: Record<string, string> = {
			'document-click-listener.ts': `/** Stub: no global click listener in React Native */
import { uuid } from './index';
export class DocumentClickListener {
  static addCallback(_id: string, _cb: (e: any) => void): void {}
  static removeCallback(_id: string): void {}
  static getInstance(): DocumentClickListener { return new DocumentClickListener(); }
}
`,
			'document-scroll-listener.ts': `/** Stub: no global scroll listener in React Native */
import { uuid } from './index';
export class DocumentScrollListener {
  static addCallback(_id: string, _cb: (e: any) => void): void {}
  static removeCallback(_id: string): void {}
  static getInstance(): DocumentScrollListener { return new DocumentScrollListener(); }
}
`,
			'floating-components.ts': `/** Stub: no floating/anchor positioning in React Native */
export const handleDataOutside = (..._args: unknown[]): void => {};
export const getFloatingPosition = (..._args: unknown[]): void => {};
`,
			'navigation.ts': `/** Stub: no DOM-based navigation triangles in React Native */
export type TriangleData = Record<string, never>;
export const handleNavigationTriangle = (..._args: unknown[]): void => {};
`,
			'react.ts': `/** Stub: no HTML-attribute filtering in React Native */
export const filterPassingProps = (_props: any, _filter: string[]): Record<string, unknown> => ({});
export const getRootProps = (_props: any, _filter?: string[]): Record<string, unknown> => ({});
`,
		};
		for (const [filename, stub] of Object.entries(webOnlyStubs)) {
			const stubPath = join(utilsDir, filename);
			if (existsSync(stubPath)) {
				writeFileSync(stubPath, stub, 'utf-8');
				console.log(`  [stub] utils/${filename}`);
			}
		}

		// Write per-component overrides (auto-generated first, manual overrides on top)
		const componentsDir = join(RN_DEST, 'components');
		for (const [relPath, content] of Object.entries(ALL_COMPONENT_OVERRIDES)) {
			const destFile = join(componentsDir, relPath);
			ensureDir(join(componentsDir, relPath.split('/')[0]));
			writeFileSync(destFile, content, 'utf-8');
			console.log(`  [override] ${relPath}`);
		}

		console.log('[RN] Done.');
	} catch (err) {
		console.error('[RN] Error:', err);
		throw err;
	}
}
