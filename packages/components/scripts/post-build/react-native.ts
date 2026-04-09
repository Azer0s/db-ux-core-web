import {
	existsSync,
	mkdirSync,
	readdirSync,
	readFileSync,
	writeFileSync
} from 'node:fs';
import { join, resolve } from 'node:path';
import { execSync } from 'node:child_process';
import { createRequire } from 'node:module';
const _require = createRequire(import.meta.url);
const transform = _require('css-to-react-native').default as (
	tuples: [string, string][]
) => Record<string, string | number>;

/** Absolute path to the monorepo root (packages/components/scripts/post-build → ../../../../) */
const REPO_ROOT = resolve(process.cwd(), '../..');

const TMP_SRC = join(REPO_ROOT, 'output/tmp/react-native/react/src');
const RN_DEST = join(REPO_ROOT, 'output/react-native/src');

// Paths used by the CSS → StyleSheet pipeline
const FOUNDATIONS_PKG = join(REPO_ROOT, 'packages/foundations');
const COMPONENTS_PKG = resolve(process.cwd()); // packages/components (cwd when tsx runs)
const COMPONENTS_CSS_BUILD = join(COMPONENTS_PKG, 'build/components');
const DB_THEME_DEFAULT_VARS = join(
	REPO_ROOT,
	'node_modules/@db-ux/db-theme/build/styles/_default_variables.scss'
);
const DB_THEME_ABSOLUTE_CSS = join(
	REPO_ROOT,
	'node_modules/@db-ux/db-theme/build/styles/absolute.css'
);

// ---------------------------------------------------------------------------
// CSS build helpers — compile foundations SCSS then component SCSS
// ---------------------------------------------------------------------------

function buildFoundationsCSS(): void {
	console.log('  [css-build] compiling foundations SCSS...');
	const opts = { cwd: FOUNDATIONS_PKG, stdio: 'inherit' as const };
	// Copy SCSS sources from src/ to build/styles/
	execSync('npx cpr scss build/styles --overwrite', opts);
	// Compile SCSS → CSS
	execSync(
		'npx sass --no-source-map --load-path=node_modules/ --load-path=../../node_modules/ build/styles',
		opts
	);
	console.log('  [css-build] foundations OK');
}

function buildComponentsCSS(): void {
	console.log('  [css-build] compiling component SCSS...');
	execSync(
		'npx sass src:build --no-source-map --load-path=node_modules/ --load-path=../../node_modules/',
		{ cwd: COMPONENTS_PKG, stdio: 'inherit' as const }
	);
	console.log('  [css-build] components OK');
}

// ---------------------------------------------------------------------------
// CSS variable map — parses all foundations + db-theme CSS to resolve tokens
// ---------------------------------------------------------------------------

type CSSVarMap = Record<string, string>;

/** Parse CSS custom property declarations from any CSS/SCSS source text */
function parseCSSVars(src: string, map: CSSVarMap): void {
	for (const match of src.matchAll(/^\s*(--[\w-]+)\s*:\s*([^;]+);/gm)) {
		const name = match[1].trim();
		if (!(name in map)) map[name] = match[2].trim();
	}
}

function buildCSSVarMap(): CSSVarMap {
	const map: CSSVarMap = {};

	// 1. Base palette from db-theme (hex colors, spacing values, etc.)
	if (existsSync(DB_THEME_DEFAULT_VARS)) {
		parseCSSVars(readFileSync(DB_THEME_DEFAULT_VARS, 'utf-8'), map);
	}

	// 2. @property initial-value blocks from absolute.css (covers numbers/lengths)
	if (existsSync(DB_THEME_ABSOLUTE_CSS)) {
		const src = readFileSync(DB_THEME_ABSOLUTE_CSS, 'utf-8');
		for (const block of src.matchAll(/@property\s+(--[\w-]+)\s*\{([^}]+)\}/gs)) {
			const varName = block[1];
			const iv = block[2].match(/initial-value\s*:\s*([^;]+);/);
			if (iv && !(varName in map)) map[varName] = iv[1].trim();
		}
	}

	// 3. Foundations built CSS (adaptive/semantic color aliases)
	//    These reference the base palette via light-dark() — we extract light values.
	const foundationsDefaultsDir = join(FOUNDATIONS_PKG, 'build/styles/defaults');
	const foundationsCSSFiles = [
		join(FOUNDATIONS_PKG, 'build/styles/bundle.css'),
		join(foundationsDefaultsDir, 'default-required.css'),
		join(foundationsDefaultsDir, 'default-root.css'),
		join(foundationsDefaultsDir, 'default-elevation.css'),
	];
	for (const f of foundationsCSSFiles) {
		if (existsSync(f)) parseCSSVars(readFileSync(f, 'utf-8'), map);
	}

	return map;
}

/**
 * Resolve all `var(--db-*)` references in a CSS value.
 * Also resolves `light-dark(light, dark)` by picking the light (first) value.
 */
function resolveCSSValue(value: string, varMap: CSSVarMap, depth = 0): string {
	if (depth > 10) return value;

	// Normalize whitespace (multi-line values from SCSS output)
	let result = value.replace(/[\n\r\t]+/g, ' ').replace(/\s{2,}/g, ' ').trim();

	// Strip !important
	result = result.replace(/\s*!important\s*$/, '').trim();

	// Skip color-mix() — these are dynamic browser-only values, no RN equivalent
	if (result.includes('color-mix(')) return '';

	// Resolve light-dark(light, dark) → take first (light) arg using paren-balanced scan
	result = result.replace(/light-dark\(/g, '\x00LIGHTDARK\x00(');
	result = result.replace(/\x00LIGHTDARK\x00\(([^]*)/s, (_m, rest) => {
		// Walk 'rest' to find the top-level comma, respecting nested ()
		let d = 1, i = 0;
		let firstCommaAt = -1;
		let closeAt = -1;
		while (i < rest.length && d > 0) {
			if (rest[i] === '(') d++;
			else if (rest[i] === ')') { d--; if (d === 0) { closeAt = i; break; } }
			else if (rest[i] === ',' && d === 1 && firstCommaAt < 0) firstCommaAt = i;
			i++;
		}
		const lightVal = firstCommaAt >= 0
			? rest.slice(0, firstCommaAt).trim()
			: (closeAt >= 0 ? rest.slice(0, closeAt).trim() : rest.trim());
		const after = closeAt >= 0 ? rest.slice(closeAt + 1) : '';
		return lightVal + after;
	});

	// Resolve var(--name, fallback) — use paren-balanced extraction for fallback
	result = result.replace(/var\(\s*(--[\w-]+)\s*(?:,([^)]*(?:\([^)]*\)[^)]*)*))?\)/g, (_m, name, fallback) => {
		const resolved = varMap[name];
		if (resolved) return resolveCSSValue(resolved, varMap, depth + 1);
		if (fallback) return resolveCSSValue(fallback.trim(), varMap, depth + 1);
		return _m;
	});

	return result;
}

// ---------------------------------------------------------------------------
// CSS property → React Native style conversion (via css-to-react-native)
// ---------------------------------------------------------------------------

type RNStyleObject = Record<string, string | number>;

// Properties that are web-only and should be silently dropped before passing
// to css-to-react-native (the library throws on unknowns).
const CSS_SKIP_PROPS = new Set([
	'display', 'cursor', 'transition', 'animation', 'animation-name',
	'animation-duration', 'animation-timing-function', 'animation-fill-mode',
	'transform', 'transform-origin', 'filter', 'box-shadow', 'box-sizing',
	'outline', 'resize', 'appearance', 'pointer-events', 'user-select',
	'white-space', 'word-break', 'overflow-wrap', 'word-wrap',
	'vertical-align', 'content', 'list-style', 'list-style-type',
	'visibility', 'clip', 'clip-path', 'will-change', 'contain',
	'isolation', 'mix-blend-mode', 'backdrop-filter', 'scroll-behavior',
	'scrollbar-width', 'scrollbar-color', 'text-overflow', 'text-shadow',
	'text-decoration-line', 'text-decoration-color', 'text-decoration-thickness',
	'text-underline-offset', 'columns', 'column-count',
	'float', 'clear', 'grid', 'grid-template', 'grid-area',
	'grid-column', 'grid-row', 'grid-template-areas', 'grid-template-columns',
	'grid-template-rows', 'place-items', 'place-content',
	'inset', 'inset-block', 'inset-inline',
	'inset-block-start', 'inset-block-end',
	'inset-inline-start', 'inset-inline-end',
	'border-block', 'border-inline', 'font',
	// text-align is only valid on Text nodes in RN, skip to avoid View warnings
	'text-align', 'text-align-last',
	// text-decoration sub-properties not supported in RN (only textDecorationLine is)
	'text-decoration-color', 'text-decoration-style', 'text-decoration-thickness',
	'text-decoration-line', 'text-decoration-skip-ink',
]);

// CSS logical properties → their RN equivalents (pre-mapped before transform)
const LOGICAL_PROP_MAP: Record<string, string> = {
	'padding-inline': 'padding-horizontal',
	'padding-block': 'padding-vertical',
	'padding-inline-start': 'padding-start',
	'padding-inline-end': 'padding-end',
	'padding-block-start': 'padding-top',
	'padding-block-end': 'padding-bottom',
	'margin-inline': 'margin-horizontal',
	'margin-block': 'margin-vertical',
	'margin-inline-start': 'margin-start',
	'margin-inline-end': 'margin-end',
	'margin-block-start': 'margin-top',
	'margin-block-end': 'margin-bottom',
	'inline-size': 'width',
	'block-size': 'height',
	'min-inline-size': 'min-width',
	'max-inline-size': 'max-width',
	'min-block-size': 'min-height',
	'max-block-size': 'max-height',
};

// RN position only supports 'absolute' | 'relative' — 'fixed'/'sticky' must be dropped
const SKIP_PROP_VALUES: Record<string, Set<string>> = {
	'position': new Set(['fixed', 'sticky']),
};

// Values that are CSS-only and should be skipped
const SKIP_VALUES = new Set(['fit-content', 'max-content', 'min-content', 'auto', 'normal', 'inherit', 'unset', 'revert', 'initial']);

/** Convert rem/em/px strings to numbers in a transform result. */
function normalizeStyleValues(styles: Record<string, unknown>): RNStyleObject {
	const result: RNStyleObject = {};
	for (const [key, val] of Object.entries(styles)) {
		if (typeof val === 'number') {
			result[key] = val;
		} else if (typeof val === 'string') {
			const remMatch = val.match(/^(-?[\d.]+)rem$/);
			if (remMatch) { result[key] = Math.round(parseFloat(remMatch[1]) * 16); continue; }
			const pxMatch = val.match(/^(-?[\d.]+)px$/);
			if (pxMatch) { result[key] = parseFloat(pxMatch[1]); continue; }
			const emMatch = val.match(/^(-?[\d.]+)em$/);
			if (emMatch) { result[key] = Math.round(parseFloat(emMatch[1]) * 14); continue; }
			// Drop multi-value strings (e.g. "0.5rem 1rem") or unresolved units
			if (/[\d]+(rem|em|px)\s+[\d]/.test(val)) continue;
			if (/ /.test(val) && /\d+(rem|em|px)/.test(val)) continue;
			// Drop multi-word keyword values (e.g. "hidden auto") — RN needs single keywords
			if (/ /.test(val) && /^[a-z-]+ [a-z-]/.test(val)) continue;
			result[key] = val;
		}
	}
	return result;
}

/**
 * Converts a single CSS declaration (property + resolved value) to a RN style
 * object using css-to-react-native. Returns {} on failure or unsupported prop.
 */
function cssDeclarationToRN(prop: string, value: string): RNStyleObject {
	prop = prop.trim().toLowerCase();
	value = value.trim();

	// Drop CSS custom properties, web-only, and any grid-* properties
	if (prop.startsWith('--') || prop.startsWith('grid-') || CSS_SKIP_PROPS.has(prop)) return {};

	// Drop unresolvable or web-only values
	if (value.includes('var(') || value.includes('calc(')) return {};
	if (!value || SKIP_VALUES.has(value)) return {};
	// Drop prop+value combos that are invalid in RN (e.g. position: fixed)
	if (SKIP_PROP_VALUES[prop]?.has(value)) return {};

	// Map CSS logical properties to the RN-compatible names transform understands
	const mappedProp = LOGICAL_PROP_MAP[prop] ?? prop;

	try {
		const raw = transform([[mappedProp, value]]);
		return normalizeStyleValues(raw);
	} catch {
		return {};
	}
}

// ---------------------------------------------------------------------------
// CSS rule extractor — parses compiled CSS and produces per-class RN styles
// ---------------------------------------------------------------------------

interface ParsedRule {
	/** e.g. "db-badge" */
	className: string;
	/** data attribute name if selector is .db-xxx[data-yyy=zzz] */
	dataAttr?: string;
	/** data attribute value */
	dataValue?: string;
	styles: RNStyleObject;
}

/**
 * Walk a CSS string extracting top-level rule blocks using brace balancing.
 * At-rules (@layer, @media, @keyframes, etc.) are skipped entirely.
 */
function extractTopLevelRules(css: string): Array<{ selector: string; declarations: string }> {
	const stripped = css.replace(/\/\*[\s\S]*?\*\//g, '');
	const result: Array<{ selector: string; declarations: string }> = [];
	let i = 0;
	const len = stripped.length;

	while (i < len) {
		while (i < len && /\s/.test(stripped[i])) i++;
		if (i >= len) break;

		const start = i;
		while (i < len && stripped[i] !== '{' && stripped[i] !== ';') i++;
		if (i >= len) break;

		if (stripped[i] === ';') { i++; continue; }

		const selector = stripped.slice(start, i).trim();
		i++; // skip '{'

		let depth = 1;
		const bodyStart = i;
		while (i < len && depth > 0) {
			if (stripped[i] === '{') depth++;
			else if (stripped[i] === '}') depth--;
			i++;
		}
		const body = stripped.slice(bodyStart, i - 1);

		if (selector.startsWith('@')) continue;

		result.push({ selector, declarations: body });
	}

	return result;
}

/**
 * Parses a CSS file and returns all rules matching simple \`.db-{name}\` selectors
 * (optionally with a single \`[data-attr=value]\` modifier).
 * Pseudo-classes, pseudo-elements, and multi-class selectors are skipped.
 */
function parseCSSRules(cssContent: string, varMap: CSSVarMap): ParsedRule[] {
	const rules: ParsedRule[] = [];

	for (const { selector, declarations } of extractTopLevelRules(cssContent)) {
		for (const rawSel of selector.split(',')) {
			const sel = rawSel.trim();

			const simpleMatch = sel.match(
				/^\.(db-[\w-]+)(?:\[data-([\w-]+)=["'"]?([\w-]+)["'"]?\])?$/
			);
			if (!simpleMatch) continue;
			if (/[: >+~]/.test(sel)) continue;

			const className = simpleMatch[1];
			const dataAttr = simpleMatch[2];
			const dataValue = simpleMatch[3];

			const styles: RNStyleObject = {};
			for (const decl of declarations.split(';')) {
				const colon = decl.indexOf(':');
				if (colon < 0) continue;
				const prop = decl.slice(0, colon).trim();
				const val = decl.slice(colon + 1).trim();
				if (!prop || !val) continue;
				const resolved = resolveCSSValue(val, varMap);
				Object.assign(styles, cssDeclarationToRN(prop, resolved));
			}

			if (Object.keys(styles).length > 0) {
				rules.push({ className, dataAttr, dataValue, styles });
			}
		}
	}

	return rules;
}


/**
 * For a given component name, reads its compiled CSS and returns a map of
 * StyleSheet keys → RN style objects.
 *
 * Keys:
 *   - "db-xxx"               → base styles for .db-xxx
 *   - "db-xxx__attr__value"  → additional styles for .db-xxx[data-attr=value]
 */
function buildComponentStyles(
	componentName: string,
	varMap: CSSVarMap
): Record<string, RNStyleObject> {
	const cssFile = join(COMPONENTS_CSS_BUILD, componentName, `${componentName}.css`);
	if (!existsSync(cssFile)) return {};

	const css = readFileSync(cssFile, 'utf-8');
	const rules = parseCSSRules(css, varMap);
	const result: Record<string, RNStyleObject> = {};

	for (const rule of rules) {
		const key = rule.dataAttr
			? `${rule.className}__${rule.dataAttr}__${rule.dataValue}`
			: rule.className;

		if (!result[key]) {
			result[key] = { ...rule.styles };
		} else {
			Object.assign(result[key], rule.styles);
		}
	}

	return result;
}

/**
 * Renders a StyleSheet.create({...}) source string from a style map.
 * Used for injection into generated component files.
 */
function renderStyleSheet(styleMap: Record<string, RNStyleObject>): string {
	const entries = Object.entries(styleMap);
	if (entries.length === 0) return 'const styles = StyleSheet.create({});\n';

	const lines: string[] = ['const styles = StyleSheet.create({'];
	for (const [key, styles] of entries) {
		const safeKey = /^[a-zA-Z_$][\w$]*$/.test(key) ? key : `"${key}"`;
		lines.push(`  ${safeKey}: {`);
		for (const [prop, val] of Object.entries(styles)) {
			const serialized = typeof val === 'string' ? `"${val}"` : String(val);
			lines.push(`    ${prop}: ${serialized},`);
		}
		lines.push('  },');
	}
	lines.push('});\n');
	return lines.join('\n');
}

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
	// Patch DOM-only observer types in model files (not in lib: ["es2022"])
	[/_resizeObserver\?: ResizeObserver;/g, '_resizeObserver?: unknown;'],
	[/_observer\?: IntersectionObserver;/g, '_observer?: unknown;'],
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
	// button → Pressable
	[/<button\b([^>]*)>/g, '<Pressable$1>'],
	[/<\/button>/g, '</Pressable>'],
	// input (self-closing) → TextInput
	[/<input\b([^/>]*)\/?>/g, '<TextInput$1/>'],
	// textarea → TextInput multiline
	[/<textarea\b([^>]*)>/g, '<TextInput multiline$1>'],
	[/<\/textarea>/g, '</TextInput>'],
	// label → Text
	[/<label\b([^>]*)>/g, '<Text$1>'],
	[/<\/label>/g, '</Text>'],
	// anchor → Pressable
	[/<a\b([^>]*)>/g, '<Pressable$1>'],
	[/<\/a>/g, '</Pressable>'],
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
// DB design tokens for React Native
// ---------------------------------------------------------------------------

const DB_TOKENS_FILE = `/**
 * DB UX Design System – React Native design tokens
 * Sourced from @db-ux/db-theme absolute CSS variables.
 * Import in your app: import { DBColors, DBTypography, DBSpacing } from "@db-ux/react-native-core-components/src/shared/tokens";
 */

/** Neutral (grey) scale — 0 = darkest, 14 = white */
export const DBColors = {
  neutral: {
    0: '#0d0e11',
    1: '#16181b',
    2: '#222428',
    3: '#2e3036',
    4: '#3b3e44',
    5: '#484b53',
    6: '#5a5e68',
    7: '#727782',
    8: '#8a919e',
    9: '#a6abb6',
    10: '#c3c7ce',
    11: '#e1e2e6',
    12: '#edeef0',
    13: '#f3f3f5',
    14: '#ffffff',
    /** Border / neutral origin */
    origin: '#646973',
  },
  /** DB brand red */
  brand: {
    origin: '#ec0016',
    dark: '#c00010',
    light: '#ff5357',
    extraLight: '#ffdada',
  },
  /** Informational (blue) */
  informational: {
    origin: '#257fa8',
    dark: '#1b6586',
    light: '#2e9acb',
    extraLight: '#cae6fd',
  },
  /** Successful (green) */
  successful: {
    origin: '#63a615',
    dark: '#4e850f',
    light: '#72bf1a',
    extraLight: '#c3ff9d',
  },
  /** Warning (amber) */
  warning: {
    origin: '#f39200',
    dark: '#ad6600',
    light: '#f69400',
    extraLight: '#ffdbc8',
  },
  /** Critical — same hue as brand red */
  critical: {
    origin: '#ec0016',
    dark: '#c00010',
    light: '#ff5357',
    extraLight: '#ffdada',
  },
} as const;

export const DBTypography = {
  size3XS: 11,
  size2XS: 12,
  sizeXS: 13,
  sizeSM: 14,
  sizeMD: 16,
  sizeLG: 20,
  sizeXL: 24,
  weightRegular: '400' as const,
  weightMedium: '500' as const,
  weightBold: '700' as const,
  lineHeightSM: 18,
  lineHeightMD: 20,
  lineHeightLG: 24,
} as const;

export const DBSpacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const DBBorderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  full: 9999,
} as const;
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
        tabBarPosition: "top" as any,
        tabBarIconStyle: { display: "none" } as any,
        ...(props.screenOptions ?? {})
      } as any}
    >
      {props.children}
    </Tabs>
  );
}

export default DBNavigation;
`,

	/* ---- DBNavigationItem → direct alias of Tabs.Screen ---- */
	'navigation-item/navigation-item.tsx': `/**
 * DBNavigationItem is a direct re-export of expo-router Tabs.Screen.
 *
 * expo-router performs a strict reference check (child.type === Tabs.Screen)
 * so this MUST be the exact same object — no wrapper component is possible.
 *
 * Usage:
 *   <DBNavigationItem name="my_screen" options={{ title: "My Screen" }} />
 */
import { Tabs } from "expo-router";

const DBNavigationItem = Tabs.Screen;
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
import { Text, Pressable, View, StyleSheet } from "react-native";
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
    <Pressable
      ref={component}
      onPress={handlePress}
      disabled={Boolean(props.disabled)}
      accessibilityRole="link"
      accessibilityLabel={props.text ?? String(props.children ?? "")}
      style={({ pressed }) => [pressed && { opacity: 0.7 }]}
    >
      <Text style={[styles.link, Boolean(props.disabled) && styles.disabled]}>
        {props.text ?? props.children}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  link: { color: "#257fa8", textDecorationLine: "underline" },
  disabled: { color: "#a6abb6", textDecorationLine: "none" }
});

const DBLink = forwardRef<View, DBLinkProps>(DBLinkFn);
export default DBLink;
`,

	/* ---- DBButton → Pressable + expo-haptics ---- */
	'button/button.tsx': `import React, { forwardRef } from "react";
import { Pressable, Text, View, StyleSheet } from "react-native";
import * as Haptics from "expo-haptics";
import { DBButtonProps } from "./model";

function DBButtonFn(props: DBButtonProps, component: any) {
  async function handlePress(event: any) {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (props.onClick) (props.onClick as any)(event);
  }

  const label = props.text ?? props.children;

  return (
    <Pressable
      ref={component}
      onPress={handlePress}
      disabled={Boolean(props.disabled)}
      accessibilityRole="button"
      accessibilityLabel={typeof label === "string" ? label : undefined}
      accessibilityState={{ disabled: Boolean(props.disabled) }}
      style={({ pressed }) => [
        styles.button,
        props.variant === "filled" && styles.filled,
        props.variant === "ghost" && styles.ghost,
        props.variant === "brand" && styles.brand,
        Boolean(props.disabled) && styles.buttonDisabled,
        props.width === "full" && styles.fullWidth,
        pressed && !Boolean(props.disabled) && { opacity: 0.75 }
      ]}
    >
      {typeof label === "string" ? (
        <Text style={[
          styles.label,
          (props.variant === "filled" || props.variant === "brand") && styles.labelInverted,
          Boolean(props.disabled) && styles.labelDisabled
        ]}>
          {label}
        </Text>
      ) : (
        label
      )}
    </Pressable>
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
    borderColor: "#646973",
    backgroundColor: "transparent"
  },
  filled: { backgroundColor: "#2e3036", borderColor: "#2e3036" },
  ghost: { borderColor: "transparent" },
  brand: { backgroundColor: "#ec0016", borderColor: "#ec0016" },
  buttonDisabled: { opacity: 0.4 },
  fullWidth: { width: "100%" },
  label: { fontSize: 14, color: "#2e3036", fontWeight: "500" },
  labelInverted: { color: "#ffffff" },
  labelDisabled: { color: "#a6abb6" }
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
    if ((props as any).onClick) (props as any).onClick(event);
  }

  return (
    <Pressable
      ref={component}
      onPress={handlePress}
      disabled={Boolean((props as any).disabled)}
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
          <DBButton variant="ghost" noText icon="menu" onClick={handleToggle}>
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
  safeArea: { backgroundColor: "#ffffff" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e1e2e6"
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
  Pressable,
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
  const isVertical = direction === "up" || direction === "down";

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
        <Pressable
          style={styles.backdrop}
          onPress={() => props.backdrop !== "none" && props.onClose?.()}
        />
        <Animated.View style={[styles.drawer, animatedStyle]}>
          <View style={styles.drawerHeader}>
            <Pressable
              onPress={() => props.onClose?.()}
              accessibilityLabel={props.closeButtonText ?? "Close"}
              accessibilityRole="button"
              style={({ pressed }) => [pressed && { opacity: 0.7 }]}
            >
              <Text style={styles.closeBtn}>✕</Text>
            </Pressable>
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
    backgroundColor: "#ffffff",
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
    borderBottomColor: "#e1e2e6"
  },
  closeBtn: { fontSize: 20, color: "#2e3036" },
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
  Pressable,
  StyleSheet
} from "react-native";
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
      <Pressable ref={triggerRef} onPress={handlePress}>
        {props.children}
      </Pressable>
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={() => setVisible(false)}
      >
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={() => setVisible(false)}
        >
          <View
            style={[
              styles.tooltip,
              { top: pos.y + pos.height + 8, left: pos.x }
            ]}
          >
            <Text style={styles.tooltipText}>
              {(props as any).tooltipText ?? props.children}
            </Text>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {},
  tooltip: {
    position: "absolute",
    backgroundColor: "#2e3036",
    borderRadius: 6,
    padding: 10,
    maxWidth: 220,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4
  },
  tooltipText: { color: "#ffffff", fontSize: 13, lineHeight: 18 }
});

const DBTooltip = forwardRef<View, DBTooltipProps>(DBTooltipFn);
export default DBTooltip;
`,

	/* ---- DBPopover → expo-blur backdrop ---- */
	'popover/popover.tsx': `import React, { forwardRef, useState, useEffect } from "react";
import {
  Modal,
  View,
  Pressable,
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
    (props as any).onClose?.();
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
          <Pressable
            style={styles.backdrop}
            onPress={handleClose}
          >
            <View style={styles.popover}>
              <ScrollView>{props.children}</ScrollView>
            </View>
          </Pressable>
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
    backgroundColor: "#ffffff",
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
              open={props.behavior === "single" ? openIndex === i : (item as any).open}
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
  const [open, setOpen] = useState(Boolean((props as any).open ?? props.defaultOpen));
  const height = useSharedValue(open ? 1 : 0);

  useEffect(() => {
    const next = Boolean((props as any).open);
    setOpen(next);
    height.value = withTiming(next ? 1 : 0, {
      duration: 220,
      easing: Easing.out(Easing.quad)
    });
  }, [(props as any).open]);

  function handlePress() {
    const next = !open;
    setOpen(next);
    height.value = withTiming(next ? 1 : 0, {
      duration: 220,
      easing: Easing.out(Easing.quad)
    });
    if (props.onToggle) props.onToggle();
    if ((props as any).onOpen && next) (props as any).onOpen();
    if ((props as any).onClose && !next) (props as any).onClose();
  }

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: height.value,
    maxHeight: height.value * 2000
  }));

  return (
    <View style={styles.container} ref={component}>
      <Pressable
        style={({ pressed }) => [styles.header, pressed && { backgroundColor: "#f3f3f5" }]}
        onPress={handlePress}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
      >
        <Text style={styles.title}>{props.headlinePlain ?? props.text}</Text>
        <Text style={styles.chevron}>{open ? "▴" : "▾"}</Text>
      </Pressable>
      <Animated.View style={[styles.body, animatedStyle]}>
        <View style={styles.bodyInner}>
          {(props as any).content
            ? <Text>{(props as any).content}</Text>
            : props.children}
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e1e2e6"
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 16
  },
  title: { fontSize: 15, fontWeight: "500", flex: 1, color: "#2e3036" },
  chevron: { fontSize: 12, color: "#5a5e68" },
  body: { overflow: "hidden" },
  bodyInner: { paddingHorizontal: 16, paddingBottom: 14 }
});

const DBAccordionItem = forwardRef<View, DBAccordionItemProps & { open?: boolean; onOpen?: () => void; onClose?: () => void; onToggle?: () => void }>(DBAccordionItemFn);
export default DBAccordionItem;
`,

	/* ---- DBTabs → expo-router Tabs (same as navigation) ---- */
	'tabs/tabs.tsx': `import React, { forwardRef, useState, useId } from "react";
import { View, ScrollView, Pressable, Text, StyleSheet } from "react-native";
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
          <Pressable
            key={String(props.name ?? uuid) + index}
            style={({ pressed }) => [
              styles.tab,
              selectedIndex === index && styles.tabActive,
              pressed && { opacity: 0.7 }
            ]}
            onPress={() => handleTabPress(index)}
            accessibilityRole="tab"
            accessibilityState={{ selected: selectedIndex === index }}
          >
            <Text style={[styles.tabText, selectedIndex === index && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </Pressable>
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
  tabBarH: { flexDirection: "row", borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#e1e2e6" },
  tabBarV: { flexDirection: "column", borderRightWidth: StyleSheet.hairlineWidth, borderRightColor: "#e1e2e6" },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: "transparent"
  },
  tabActive: { borderBottomColor: "#ec0016" },
  tabText: { fontSize: 14, color: "#5a5e68" },
  tabTextActive: { color: "#2e3036", fontWeight: "600" },
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
          trackColor={{ false: "#c3c7ce", true: "#ec0016" }}
          thumbColor="#ffffff"
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
  label: { flex: 1, fontSize: 14, color: "#2e3036" }
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
        style={({ pressed }) => [styles.row, pressed && { opacity: 0.75 }]}
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
  box: { width: 20, height: 20, borderWidth: 2, borderColor: "#646973", borderRadius: 3, alignItems: "center", justifyContent: "center" },
  boxChecked: { backgroundColor: "#2e3036", borderColor: "#2e3036" },
  boxDisabled: { borderColor: "#a6abb6", backgroundColor: "#f3f3f5" },
  tick: { color: "#ffffff", fontSize: 13, fontWeight: "bold" },
  label: { fontSize: 14, color: "#2e3036", flex: 1 },
  labelDisabled: { color: "#a6abb6" }
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
        style={({ pressed }) => [styles.row, pressed && { opacity: 0.75 }]}
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
      {stringPropVisible((props as any).message, (props as any).showMessage) && (
        <DBInfotext size="small" semantic="adaptive">{(props as any).message}</DBInfotext>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginVertical: 4 },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  outer: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: "#646973", alignItems: "center", justifyContent: "center" },
  outerDisabled: { borderColor: "#a6abb6" },
  inner: { width: 10, height: 10, borderRadius: 5, backgroundColor: "#ec0016" },
  label: { fontSize: 14, color: "#2e3036", flex: 1 },
  labelDisabled: { color: "#a6abb6" }
});

const DBRadio = forwardRef<View, DBRadioProps>(DBRadioFn);
export default DBRadio;
`,

	/* ---- DBSelect → Modal picker ---- */
	'select/select.tsx': `import React, { forwardRef, useState, useId } from "react";
import { View, Text, Pressable, Modal, FlatList, StyleSheet } from "react-native";
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
        style={({ pressed }) => [styles.trigger, Boolean(props.disabled) && styles.triggerDisabled, pressed && { opacity: 0.8 }]}
        onPress={() => !Boolean(props.disabled) && setOpen(true)}
        accessibilityRole="combobox"
        accessibilityState={{ expanded: open, disabled: Boolean(props.disabled) }}
      >
        <Text style={styles.triggerText}>{display}</Text>
        <Text style={styles.arrow}>▾</Text>
      </Pressable>
      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <View style={styles.sheet}>
            <FlatList
              data={options}
              keyExtractor={(item, i) => typeof item === "string" ? item : ((item as any).value ?? String(i))}
              renderItem={({ item }) => {
                const val = typeof item === "string" ? item : (item as any).value ?? "";
                const lbl = typeof item === "string" ? item : (item as any).label ?? val;
                return (
                  <Pressable
                    style={({ pressed }) => [styles.option, val === selected && styles.optionSelected, pressed && { backgroundColor: "#edeef0" }]}
                    onPress={() => handleSelect(item)}
                  >
                    <Text style={[styles.optionText, val === selected && styles.optionTextSelected]}>{lbl}</Text>
                  </Pressable>
                );
              }}
            />
          </View>
        </Pressable>
      </Modal>
      {stringPropVisible(props.message, props.showMessage) && (
        <DBInfotext size="small" semantic="adaptive">{props.message}</DBInfotext>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginVertical: 4 },
  label: { fontSize: 12, color: "#5a5e68", marginBottom: 4 },
  trigger: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: "#646973", borderRadius: 4, padding: 10, backgroundColor: "#ffffff" },
  triggerDisabled: { borderColor: "#a6abb6", backgroundColor: "#f3f3f5" },
  triggerText: { flex: 1, fontSize: 14, color: "#2e3036" },
  arrow: { fontSize: 14, color: "#5a5e68" },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.3)", justifyContent: "flex-end" },
  sheet: { backgroundColor: "#ffffff", borderTopLeftRadius: 12, borderTopRightRadius: 12, maxHeight: "50%", padding: 8 },
  option: { padding: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#e1e2e6" },
  optionSelected: { backgroundColor: "#edeef0" },
  optionText: { fontSize: 15, color: "#2e3036" },
  optionTextSelected: { fontWeight: "bold", color: "#ec0016" }
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
        placeholderTextColor="#a6abb6"
        editable={!Boolean(props.disabled)}
        secureTextEntry={props.type === "password"}
        keyboardType={props.type === "email" ? "email-address" : props.type === "number" || props.type === "tel" ? "numeric" : "default"}
        maxLength={typeof props.maxLength === "number" ? props.maxLength : undefined}
        accessibilityLabel={props.label ?? props.placeholder}
        onFocus={() => { setFocused(true); if (props.onFocus) (props.onFocus as any)(); }}
        onBlur={() => { setFocused(false); if (props.onBlur) (props.onBlur as any)(); }}
      />
      {(props as any).description && <Text style={styles.description}>{(props as any).description}</Text>}
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
  label: { fontSize: 12, color: "#5a5e68", marginBottom: 4 },
  required: { color: "#ec0016" },
  input: { borderWidth: 1, borderColor: "#646973", borderRadius: 4, padding: 10, fontSize: 14, backgroundColor: "#ffffff", color: "#2e3036" },
  focused: { borderColor: "#257fa8", borderWidth: 2 },
  invalid: { borderColor: "#ec0016" },
  valid: { borderColor: "#63a615" },
  disabled: { borderColor: "#a6abb6", backgroundColor: "#f3f3f5", color: "#a6abb6" },
  description: { fontSize: 12, color: "#727782", marginTop: 4 }
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
        placeholderTextColor="#a6abb6"
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
  label: { fontSize: 12, color: "#5a5e68", marginBottom: 4 },
  required: { color: "#ec0016" },
  input: { borderWidth: 1, borderColor: "#646973", borderRadius: 4, padding: 10, fontSize: 14, backgroundColor: "#ffffff", color: "#2e3036", minHeight: 80 },
  invalid: { borderColor: "#ec0016" },
  valid: { borderColor: "#63a615" },
  disabled: { borderColor: "#a6abb6", backgroundColor: "#f3f3f5", color: "#a6abb6" }
});

const DBTextarea = forwardRef<RNTextInput, DBTextareaProps>(DBTextareaFn);
export default DBTextarea;
`,

	/* ---- DBCustomSelect → Modal multi-select picker ---- */
	'custom-select/custom-select.tsx': `import React, { forwardRef, useState } from "react";
import { View, Text, Pressable, Modal, FlatList, StyleSheet } from "react-native";
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
    if ((props as any).onValueChange) (props as any).onValueChange(next.join(","));
    if (props.onOptionSelected) (props.onOptionSelected as any)(val);
  }

  return (
    <View style={styles.container} ref={component}>
      {props.label && <Text style={styles.label}>{props.label}</Text>}
      <Pressable
        style={({ pressed }) => [styles.trigger, Boolean(props.disabled) && styles.triggerDisabled, pressed && { opacity: 0.8 }]}
        onPress={() => !Boolean(props.disabled) && setOpen(true)}
        accessibilityRole="combobox"
        accessibilityState={{ expanded: open }}
      >
        <Text style={styles.triggerText}>{display}</Text>
        <Text style={styles.arrow}>{open ? "▴" : "▾"}</Text>
      </Pressable>
      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
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
                  <Pressable
                    style={({ pressed }) => [styles.option, isSel && styles.optionSelected, pressed && { backgroundColor: "#edeef0" }]}
                    onPress={() => handleSelect(val)}
                  >
                    {props.multiple && (
                      <View style={[styles.check, isSel && styles.checkSelected]}>
                        {isSel && <Text style={styles.checkMark}>✓</Text>}
                      </View>
                    )}
                    <Text style={[styles.optionText, isSel && styles.optionTextSelected]}>{lbl}</Text>
                  </Pressable>
                );
              }}
            />
          </View>
        </Pressable>
      </Modal>
      {props.children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginVertical: 4 },
  label: { fontSize: 12, color: "#5a5e68", marginBottom: 4 },
  trigger: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: "#646973", borderRadius: 4, padding: 10, backgroundColor: "#ffffff" },
  triggerDisabled: { borderColor: "#a6abb6", backgroundColor: "#f3f3f5" },
  triggerText: { flex: 1, fontSize: 14, color: "#2e3036" },
  arrow: { fontSize: 14, color: "#5a5e68" },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.3)", justifyContent: "flex-end" },
  sheet: { backgroundColor: "#ffffff", borderTopLeftRadius: 12, borderTopRightRadius: 12, maxHeight: "60%", padding: 8 },
  option: { flexDirection: "row", alignItems: "center", padding: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#e1e2e6" },
  optionSelected: { backgroundColor: "#edeef0" },
  optionText: { fontSize: 15, color: "#2e3036", flex: 1 },
  optionTextSelected: { fontWeight: "bold" },
  check: { width: 20, height: 20, borderWidth: 2, borderColor: "#646973", borderRadius: 3, alignItems: "center", justifyContent: "center", marginRight: 10 },
  checkSelected: { backgroundColor: "#ec0016", borderColor: "#ec0016" },
  checkMark: { color: "#ffffff", fontSize: 12, fontWeight: "bold" }
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
    backgroundColor: "#ec0016",
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    alignSelf: "flex-start",
  },
  text: { color: "#ffffff", fontSize: 11, fontWeight: "bold" },
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
import { View, Pressable, StyleSheet } from "react-native";
import type { DBCardProps } from "./model";

function DBCard(props: DBCardProps) {
  if (props.onClick) {
    return (
      <Pressable
        style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}
        onPress={props.onClick as any}
      >
        {props.children}
      </Pressable>
    );
  }
  return <View style={styles.card}>{props.children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 8,
    padding: 16,
    marginVertical: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
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
  const isVertical = props.variant === "vertical";
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
  divider: { backgroundColor: "#e1e2e6" },
  horizontal: { height: 1, alignSelf: "stretch", marginVertical: 8 },
  vertical: { width: 1, alignSelf: "stretch", marginHorizontal: 8 },
});

export default DBDivider;
`,

  'infotext/infotext.tsx': `import React from "react";
import { View, Text, StyleSheet } from "react-native";
import type { DBInfotextProps } from "./model";

const semanticColor: Record<string, string> = {
  informational: "#257fa8",
  successful: "#63a615",
  warning: "#f39200",
  critical: "#ec0016",
  adaptive: "#5a5e68",
};

function DBInfotext(props: DBInfotextProps) {
  const color = semanticColor[props.semantic ?? "adaptive"] ?? "#5a5e68";
  return (
    <View style={styles.container}>
      <Text style={[styles.text, { color }]}>{props.text ?? props.children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingVertical: 4 },
  text: { fontSize: 13 },
});

export default DBInfotext;
`,

  'notification/notification.tsx': `import React, { useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { stringPropVisible } from "../../utils";
import type { DBNotificationProps } from "./model";
import { DEFAULT_CLOSE_BUTTON } from "../../shared/constants";

const semanticBorder: Record<string, string> = {
  informational: "#257fa8",
  successful: "#63a615",
  warning: "#f39200",
  critical: "#ec0016",
  adaptive: "#646973",
};

function DBNotification(props: DBNotificationProps) {
  const [visible, setVisible] = useState(true);

  if (!visible) return null;

  const borderColor = semanticBorder[props.semantic ?? "adaptive"] ?? "#646973";

  return (
    <View style={[styles.container, { borderLeftColor: borderColor }]} accessibilityRole="alert">
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
        <Pressable
          style={({ pressed }) => [styles.closeBtn, pressed && { opacity: 0.7 }]}
          onPress={() => {
            setVisible(false);
            if (props.onClose) (props.onClose as any)();
          }}
          accessibilityLabel={props.closeButtonText ?? DEFAULT_CLOSE_BUTTON}
          accessibilityRole="button"
        >
          <Text style={styles.closeBtnText}>✕</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#ffffff",
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: "#646973",
    padding: 12,
    marginVertical: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  imageSlot: { marginBottom: 8 },
  headline: { fontSize: 16, fontWeight: "bold", marginBottom: 4, color: "#2e3036" },
  body: { fontSize: 14, color: "#2e3036" },
  timestamp: { fontSize: 11, color: "#727782", marginTop: 4 },
  closeBtn: { position: "absolute", top: 8, right: 8, padding: 4 },
  closeBtnText: { fontSize: 16, color: "#5a5e68" },
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
  const isHorizontal = props.direction === "row";
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
import { View, Text, Pressable, StyleSheet } from "react-native";
import { DEFAULT_REMOVE } from "../../shared/constants";
import type { DBTagProps } from "./model";

function DBTag(props: DBTagProps) {
  const removeLabel = props.removeButton ?? DEFAULT_REMOVE;
  return (
    <View style={styles.tag}>
      <Text style={styles.text}>{props.content ?? props.text ?? props.children}</Text>
      {props.behavior === "removable" ? (
        <Pressable
          style={({ pressed }) => [styles.removeBtn, pressed && { opacity: 0.7 }]}
          onPress={props.onRemove as any}
          accessibilityLabel={removeLabel}
          accessibilityRole="button"
        >
          <Text style={styles.removeBtnText}>✕</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  tag: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#edeef0",
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginRight: 4,
    marginBottom: 4,
    alignSelf: "flex-start",
  },
  text: { fontSize: 13, color: "#2e3036" },
  removeBtn: { marginLeft: 6, padding: 2 },
  removeBtnText: { fontSize: 12, color: "#5a5e68" },
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
import { Pressable, Text, StyleSheet } from "react-native";
import type { DBTabItemProps } from "./model";

function DBTabItem(props: DBTabItemProps) {
  const selected = Boolean(props.active);
  return (
    <Pressable
      style={({ pressed }) => [styles.item, selected && styles.selected, pressed && { opacity: 0.75 }]}
      onPress={(props as any).onSelect}
      accessibilityRole="tab"
      accessibilityState={{ selected }}
    >
      <Text style={[styles.label, selected && styles.labelSelected]}>
        {props.label ?? props.children}
      </Text>
    </Pressable>
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
  selected: { borderBottomColor: "#ec0016" },
  label: { fontSize: 14, color: "#5a5e68" },
  labelSelected: { color: "#2e3036", fontWeight: "bold" },
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
import { View, Text, Pressable, StyleSheet } from "react-native";
import { getBoolean } from "../../utils";
import type { DBCustomSelectListItemProps } from "./model";

function DBCustomSelectListItem(props: DBCustomSelectListItemProps) {
  const selected = getBoolean(props.checked);
  const disabled = getBoolean(props.disabled);
  return (
    <Pressable
      style={({ pressed }) => [
        styles.item,
        selected && styles.selected,
        disabled && styles.disabled,
        pressed && !disabled && { backgroundColor: "#edeef0" }
      ]}
      onPress={!disabled ? (props.onChange as any) : undefined}
      disabled={disabled}
      accessibilityRole="menuitem"
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
    </Pressable>
  );
}

const styles = StyleSheet.create({
  item: { flexDirection: "row", alignItems: "center", padding: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#e1e2e6" },
  selected: { backgroundColor: "#edeef0" },
  disabled: { opacity: 0.4 },
  check: { width: 18, height: 18, borderWidth: 2, borderColor: "#646973", borderRadius: 3, alignItems: "center", justifyContent: "center", marginRight: 10 },
  checkSelected: { backgroundColor: "#ec0016", borderColor: "#ec0016" },
  checkMark: { color: "#ffffff", fontSize: 11, fontWeight: "bold" },
  label: { fontSize: 14, color: "#2e3036", flex: 1 },
  disabledText: { color: "#a6abb6" },
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
// Example-file cleanup + spec purge
// ---------------------------------------------------------------------------

import { unlinkSync } from 'node:fs';

function cleanExamplesAndPurgeSpecs(rootDir: string) {
	let examplesCleaned = 0;
	let specsPurged = 0;

	function walk(dir: string) {
		if (!existsSync(dir)) return;
		for (const entry of readdirSync(dir, { withFileTypes: true })) {
			const fullPath = join(dir, entry.name);
			if (entry.isDirectory()) {
				walk(fullPath);
			} else if (entry.name.endsWith('.spec.ts') || entry.name.endsWith('.spec.tsx') || entry.name.endsWith('.test.ts') || entry.name.endsWith('.test.tsx')) {
				unlinkSync(fullPath);
				specsPurged++;
			} else if (entry.name.endsWith('.example.tsx') || entry.name.endsWith('.example.ts') ||
			entry.name.endsWith('.showcase.tsx') || entry.name.endsWith('.showcase.ts')) {
				let src = readFileSync(fullPath, 'utf-8');
				// Remove className prop (no meaning in RN)
				src = src.replace(/\s+className="[^"]*"/g, '');
				src = src.replace(/\s+className=\{[^}]*\}/g, '');
				// Convert WAI-ARIA role= to accessibilityRole= (only plain string values)
				src = src.replace(/\brole="([^"]+)"/g, 'accessibilityRole="$1"');
				// Remove HTMLInputElement / HTMLElement type casts in examples
				src = src.replace(/ as HTML\w+Element/g, '');
				src = src.replace(/\(event\.target as HTML\w+Element\)\./g, '(event as any).');
				writeFileSync(fullPath, src, 'utf-8');
				examplesCleaned++;
			}
		}
	}

	walk(rootDir);
	console.log(`  [examples] cleaned ${examplesCleaned} example files, purged ${specsPurged} spec files`);
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

export default function reactNative(_tmp?: boolean) {
	try {
		console.log(`[RN] src:  ${TMP_SRC}`);
		console.log(`[RN] dest: ${RN_DEST}`);

		// -----------------------------------------------------------------------
		// Step 0: Build foundations + component CSS for StyleSheet conversion
		// -----------------------------------------------------------------------
		buildFoundationsCSS();
		buildComponentsCSS();

		// Build CSS variable map once (used for all components)
		console.log('  [css→rn] building CSS variable map...');
		const cssVarMap = buildCSSVarMap();
		console.log(`  [css→rn] ${Object.keys(cssVarMap).length} CSS variables loaded`);

		copyAndTransformDir(TMP_SRC, RN_DEST);

		// Write design tokens file
		const sharedDir = join(RN_DEST, 'shared');
		ensureDir(sharedDir);
		writeFileSync(join(sharedDir, 'tokens.ts'), DB_TOKENS_FILE, 'utf-8');
		console.log('  [tokens] shared/tokens.ts');

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
			// Replace @db-ux/core-foundations import with an inline stub
			// (foundations may not be built in the consumer's environment)
			m = m.replace(
				/import \{ IconTypes \} from '@db-ux\/core-foundations';\n?/g,
				'/** Stub: icon name — use any string matching the DB icon set */\nexport type IconTypes = string;\n'
			);
			m = m
				.replace(/export type ClickEvent<T> = [^;]+;/, '')
				.replace(/export type ChangeEvent<T> = [^;]+;/, '')
				.replace(/export type InputEvent<T> = [^;]+;/, '')
				.replace(/export type InteractionEvent<T> = [^;]+;/, '')
				.replace(/export type GeneralEvent<T> = [^;]+;/, '')
				.replace(/export type GeneralKeyboardEvent<T> = [^;]+;/, '');
			// Patch DOM-only types that aren't in lib: ["es2022"]
			m = m.replace(/_observer\?: IntersectionObserver;/g, '_observer?: unknown;');
			m = m.replace(/: ResizeObserver\b/g, ': unknown');
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
/** RN stub — the original class is DOM-only */
export class NavigationItemSafeTriangle {
  constructor(..._args: unknown[]) {}
  destroy(): void {}
}
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

		// -----------------------------------------------------------------------
		// CSS → StyleSheet injection for all component overrides
		// -----------------------------------------------------------------------
		// For each component, parse its compiled CSS and inject a `cssStyles`
		// StyleSheet const. In AUTO_COMPONENT_OVERRIDES (the simpler ones, not in
		// the manual COMPONENT_OVERRIDES), also update the container style to
		// merge CSS-derived styles with the existing hardcoded ones.
		// -----------------------------------------------------------------------
		console.log('  [css→rn] injecting CSS-derived styles into components...');
		let injected = 0;
		for (const [relPath] of Object.entries(ALL_COMPONENT_OVERRIDES)) {
			if (!relPath.endsWith('.tsx')) continue;
			const componentName = relPath.split('/')[0];
			const destFile = join(componentsDir, relPath);
			const styleMap = buildComponentStyles(componentName, cssVarMap);
			if (Object.keys(styleMap).length === 0) continue;

			let src = readFileSync(destFile, 'utf-8');

			// Append cssStyles to the file (before the final export default line)
			const cssStylesCode = renderStyleSheet(styleMap).replace(
				'const styles = StyleSheet.create(',
				'const cssStyles = StyleSheet.create('
			);

			// Ensure StyleSheet is imported
			if (!src.includes('StyleSheet')) {
				const rnImportMatch = src.match(/import \{([^}]+)\} from "react-native";/);
				if (rnImportMatch) {
					// Add StyleSheet to existing react-native import
					src = src.replace(
						rnImportMatch[0],
						`import { ${rnImportMatch[1].trim()}, StyleSheet } from "react-native";`
					);
				} else {
					// No react-native import — insert after the last import statement
					const lastImportEnd = [...src.matchAll(/^import .+;$/gm)].at(-1);
					if (lastImportEnd?.index !== undefined) {
						const at = lastImportEnd.index + lastImportEnd[0].length;
						src = src.slice(0, at) + '\nimport { StyleSheet } from "react-native";' + src.slice(at);
					} else {
						src = 'import { StyleSheet } from "react-native";\n' + src;
					}
				}
			}

			// For AUTO components (not manually crafted), merge cssStyles into container
			const isAutoOnly = relPath in AUTO_COMPONENT_OVERRIDES &&
				!(relPath in COMPONENT_OVERRIDES);
			if (isAutoOnly) {
				const baseClass = `db-${componentName}`;
				if (styleMap[baseClass]) {
					// style={styles.container} → style={[cssStyles['db-xxx'], styles.container]}
					src = src.replace(
						/style=\{styles\.container\}/g,
						`style={[cssStyles['${baseClass}'], styles.container]}`
					);
				}
			}

			// Inject the cssStyles const before the final export line
			const exportMatch = src.match(/\nexport default /);
			if (exportMatch && exportMatch.index !== undefined) {
				src = src.slice(0, exportMatch.index) + '\n' + cssStylesCode + src.slice(exportMatch.index);
			} else {
				src += '\n' + cssStylesCode;
			}

			writeFileSync(destFile, src, 'utf-8');
			injected++;
		}
		console.log(`  [css→rn] injected CSS styles into ${injected} components`);

		// -----------------------------------------------------------------------
		// Post-process example files and purge spec/test files
		// -----------------------------------------------------------------------
		cleanExamplesAndPurgeSpecs(RN_DEST);

		console.log('[RN] Done.');
	} catch (err) {
		console.error('[RN] Error:', err);
		throw err;
	}
}
