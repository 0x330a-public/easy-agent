import type { Config } from 'tailwindcss';
import daisyui from 'daisyui';
import typography from '@tailwindcss/typography';

export default {
	content: ['./src/**/*.{html,js,svelte,ts}'],

	theme: {
		extend: {},
		container: {
			center: true,
		},
	},
	plugins: [daisyui, typography],
	daisyui: {
		themes: ["dim"]
	}
} satisfies Config;
