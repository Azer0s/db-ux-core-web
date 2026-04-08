const onClickPlugin = require('../plugins/on-click.cjs');
const useIdPlugin = require('../plugins/useId.cjs');

/**
 * @type {import('@builder.io/mitosis').ToReactOptions}
 * We use the React target as the base for React Native, then apply
 * a post-build transformation to replace HTML elements with RN primitives.
 */
module.exports = {
	typescript: true,
	plugins: [useIdPlugin, onClickPlugin]
};
