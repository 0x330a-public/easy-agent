<script lang="ts">

	import { connected, disconnectWagmi, web3Modal } from 'svelte-wagmi';
	import PowerIcon from '../components/PowerIcon.svelte';
	import AgentInfo from '../components/AgentInfo.svelte';
	import { PUBLIC_COOLIFY_FQDN } from '$env/static/public';

	const frame = {
		version: "next",
		imageUrl: `${PUBLIC_COOLIFY_FQDN}/og-image.jpg`,
		button: {
			title: "Launch",
			action: {
				type: "launch_frame",
				name: "easy-agent",
				url: PUBLIC_COOLIFY_FQDN,
				splashImageUrl: `${PUBLIC_COOLIFY_FQDN}/splash.jpg`,
				splashBackgroundColor: "#060c2e",
			},
		},
	}

</script>

<svelte:head>
	<meta property="og:title" content="Words"/>
	<meta property="og:description" content="Word game v2 frame in Svelte"/>
	<meta property="og:type" content="website"/>
	<meta property="og:image" content="{PUBLIC_COOLIFY_FQDN}/splash.jpg"/>
	<meta property="fc:frame" content={JSON.stringify(frame)} />
</svelte:head>


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
		<div class="navbar bg-base-200 mb-8 rounded-xl">
			<div class="flex-1">
				<p class="btn btn-ghost text-xl">easy-agent</p>
			</div>
			<PowerIcon class="mx-auto btn btn-primary" onClick={() => disconnectWagmi()}>Disconnect</PowerIcon>
		</div>

		<AgentInfo/>

	{/if}
</div>
