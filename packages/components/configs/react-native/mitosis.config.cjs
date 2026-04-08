const reactNative = require('./index.cjs');

/**
 * @type {import('@builder.io/mitosis').MitosisConfig}
 * Generates React output targeted for post-build transformation to React Native.
 */
module.exports = {
	files: 'src/**/*.{lite.tsx,ts}',
	exclude: ['src/**/*.agent.lite.tsx'],
	targets: ['react'],
	dest: '../../output/tmp/react-native',
	options: {
		react: reactNative
	}
};
