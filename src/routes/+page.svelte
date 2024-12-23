<script lang="ts">

	import { defaultConfig } from 'svelte-wagmi';
	import { onMount } from 'svelte';
	import { injected, walletConnect } from '@wagmi/connectors';
	import { optimism } from 'viem/chains';
	import { PUBLIC_WALLET_CONNECT_PROJECT_ID } from "$env/static/public";

	import { web3Modal, connected, disconnectWagmi } from 'svelte-wagmi';
	import {farcasterFrame} from "@farcaster/frame-wagmi-connector";
	import PowerIcon from '../components/PowerIcon.svelte';
	import AgentInfo from '../components/AgentInfo.svelte';

	onMount(async () => {
		const easyAgent = defaultConfig({
			appName: "easy-agent",
			chains: [optimism],
			walletConnectProjectId: PUBLIC_WALLET_CONNECT_PROJECT_ID,
			connectors: [injected(), farcasterFrame(), walletConnect({
				showQrModal: false,
				projectId: PUBLIC_WALLET_CONNECT_PROJECT_ID
			})],
		})

		await easyAgent.init();
	})

</script>
<div class="container mx-auto">
	{#if $web3Modal && !$connected}
		<div class="hero bg-base-200 my-24 h-1/3 py-12">
			<div class="hero-content text-center flex-col">
				<div class="max-w-md">
					<h1 class="text-5xl font-bold">Connect</h1>
					<p class="py-6">
						Connect a wallet which will sponsor the transactions for your agent's signup
					</p>
					<button class="btn btn-primary" onclick={()=> $web3Modal.open()}>Connect Wallet</button>
				</div>
			</div>
		</div>
	{:else}
		<div class="navbar bg-base-200 my-8 rounded-xl">
			<div class="flex-1">
				<p class="btn btn-ghost text-xl">easy-agent</p>
			</div>
			<PowerIcon class="mx-auto btn btn-primary" onClick={() => disconnectWagmi()}>Disconnect</PowerIcon>
		</div>

		<AgentInfo/>

	{/if}
</div>
