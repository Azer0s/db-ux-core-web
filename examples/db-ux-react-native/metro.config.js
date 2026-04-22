const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

// Watch the whole workspace root so Metro sees output/react-native (the symlink target).
config.watchFolders = [workspaceRoot];

// Only resolve modules from the app's own node_modules.
// Do NOT include workspaceRoot/node_modules — it contains React Native 0.81.5 and other
// conflicting versions that trigger TurboModuleRegistry.getEnforcing('PlatformConstants') crashes.
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
];

// Required so Metro follows node_modules/@db-ux/react-native-core-components -> output/react-native.
config.resolver.unstable_enableSymlinks = true;

// Pin singleton packages to the app's node_modules. Without this, files inside the symlinked
// output/react-native package resolve to copies installed there (e.g. react@19.1.0), causing
// duplicate-module crashes at runtime.
const PINNED_MODULES = {
  "react": require.resolve("react", { paths: [projectRoot] }),
  "react/jsx-runtime": require.resolve("react/jsx-runtime", { paths: [projectRoot] }),
  "react/jsx-dev-runtime": require.resolve("react/jsx-dev-runtime", { paths: [projectRoot] }),
  "react-native": require.resolve("react-native", { paths: [projectRoot] }),
  "expo": require.resolve("expo", { paths: [projectRoot] }),
  "expo-font": require.resolve("expo-font", { paths: [projectRoot] }),
  "expo-linking": require.resolve("expo-linking", { paths: [projectRoot] }),
  "@expo/vector-icons": require.resolve("@expo/vector-icons", { paths: [projectRoot] }),
  // expo-asset is nested inside expo/node_modules, not hoisted. Without this pin,
  // expo-font falls through to the workspace root's expo-asset (old SDK), which pulls in
  // workspace root's expo-modules-core and react-native 0.81.5 — causing the
  // TurboModuleRegistry.getEnforcing('PlatformConstants') crash at startup.
  "expo-asset": require.resolve("expo-asset", { paths: [path.resolve(projectRoot, "node_modules/expo")] }),
};

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (PINNED_MODULES[moduleName]) {
    return { type: "sourceFile", filePath: PINNED_MODULES[moduleName] };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
