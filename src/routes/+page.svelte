<script lang="ts">

	import { connected, disconnectWagmi, web3Modal } from 'svelte-wagmi';
	import PowerIcon from '../components/PowerIcon.svelte';
	import AgentInfo from '../components/AgentInfo.svelte';

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
