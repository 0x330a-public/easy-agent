<script lang="ts">
	import '../app.css';
	let { children } = $props();

	// frames
	import { onMount } from "svelte";
	import { defaultConfig } from "svelte-wagmi";
	import {farcasterFrame} from "@farcaster/frame-wagmi-connector";

	import { optimism } from 'viem/chains';
	import { PUBLIC_WALLET_CONNECT_PROJECT_ID } from '$env/static/public';
	import sdk from "@farcaster/frame-sdk";
	import { injected, walletConnect } from '@wagmi/connectors';

	onMount(async () => {
		const easyAgent = defaultConfig({
			appName: "easy-agent",
			chains: [optimism],
			walletConnectProjectId: PUBLIC_WALLET_CONNECT_PROJECT_ID,
			connectors: [farcasterFrame(), injected(), walletConnect({
				showQrModal: false,
				projectId: PUBLIC_WALLET_CONNECT_PROJECT_ID
			})],
		})
		await easyAgent.init();
		await sdk.actions.ready();
	});

</script>

{@render children()}
