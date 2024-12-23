import { defineConfig } from 'vitest/config';
import { sveltekit } from '@sveltejs/kit/vite';

export default defineConfig({
	plugins: [sveltekit()],
	ssr: {
		noExternal: ["@farcaster/frame-sdk", "@farcaster/frame-core", "@farcaster/frame-wagmi-connector"]
	},
	test: {
		include: ['src/**/*.{test,spec}.{js,ts}']
	}
});
