const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

// Watch the component lib source so metro resolves file: deps correctly
config.watchFolders = [workspaceRoot];

config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];

config.resolver.unstable_enableSymlinks = true;

// Force all react/react-native imports — regardless of which file they come from
// (including component lib dist files deep in the workspace) — to resolve from
// the app's own node_modules. Without this, Metro walks up from
// output/react-native/dist/ and finds the workspace root's react copy first,
// causing duplicate-React "Invalid hook call" errors at runtime.
const PINNED_MODULES = {
  "react": require.resolve("react", { paths: [projectRoot] }),
  "react/jsx-runtime": require.resolve("react/jsx-runtime", { paths: [projectRoot] }),
  "react/jsx-dev-runtime": require.resolve("react/jsx-dev-runtime", { paths: [projectRoot] }),
  "react-native": require.resolve("react-native", { paths: [projectRoot] }),
  // Pin expo-font to the app's SDK-54-compatible version (not workspace root's SDK-55 copy)
  "expo-font": require.resolve("expo-font", { paths: [projectRoot] }),
  // expo-font uses expo-asset, which is nested under expo/node_modules (not hoisted).
  // Without this pin Metro falls through to workspace root's expo-asset@55 (SDK 55, wrong).
  "expo-asset": require.resolve("expo-asset", { paths: [path.resolve(projectRoot, "node_modules/expo")] }),
};

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (PINNED_MODULES[moduleName]) {
    return { type: "sourceFile", filePath: PINNED_MODULES[moduleName] };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
