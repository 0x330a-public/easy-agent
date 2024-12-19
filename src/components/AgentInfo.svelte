<script lang="ts">

	import { edSk, ethSk } from '../stores';

	import { derived as storeDerive, get } from 'svelte/store';

	import { signerAddress, wagmiConfig } from 'svelte-wagmi';

	import * as ed from '@noble/ed25519';
	import { sha512 } from "@noble/hashes/sha512";
	ed.etc.sha512Sync = (...m) => sha512(ed.etc.concatBytes(...m));

	import { bytesToHex, type Hex, hexToBytes } from 'viem';
	import { browser } from '$app/environment';
	import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
	import { getFid, signAddKey, signOnboarding } from '../utils';

	const generateNew = () => {
		const newValue = ed.utils.randomPrivateKey();
		edSk.set(bytesToHex(newValue));
	}

	const generateEth = () => {
		const newValue = generatePrivateKey();
		ethSk.set(newValue);
	}

	if (browser) {
		if (get(edSk) === "0x") {
			generateNew();
		}
		if (get(ethSk) === "0x") {
			generateEth();
		}
	}

	const type = storeDerive(edSk, (value) => typeof(value));

	let fid = $state(0n);
	let keyAdded = $state(false);

	let step = $derived.by(()=> {
		const hasFid = fid !== 0n ? 1 : 0;
		const hasKey = keyAdded ? 1 : 0;
		return hasFid + hasKey;
	});

	$effect(() => {
		const address = $signerAddress;
		const config = $wagmiConfig;
		if (address && config && !processing) {
			getFid(config, address as Hex).then((value) => {
				fid = value;
			});
		} else {
			fid = 0n;
		}
	});

	let edHover = $state(false);
	let ethHover = $state(false);

	let processing = $state(false);

	const edValue = $derived(edHover ? get(edSk) : "*".repeat(get(edSk).length));

	const ethValue = $derived(ethHover ? get(ethSk) : "*".repeat(get(ethSk).length));

	const ethSigner = storeDerive(ethSk, (secretKey) => secretKey !== "0x" ? privateKeyToAccount(secretKey as Hex) : null);
	const ethAddress = $derived($ethSigner?.address || "0x");

	const unfilledStep = "step px-2";
	const filledStep = `${unfilledStep} step-primary`;

	const unfilledBtn = "btn";
	const filledBtn = `${unfilledBtn} btn-primary`

	const tryRegister = async () => {
		const signer = $ethSigner;
		if (step !== 0 || processing || !signer || !$signerAddress) return;
		processing = true;
		try {
			fid = await signOnboarding($wagmiConfig, signer, $signerAddress as Hex);
		} finally {
			processing = false;
		}

	};

	const tryAddKey = async () => {
		const signer = $ethSigner;
		const sk = get(edSk);
		const pubKey = sk && sk !== "0x" ? ed.getPublicKey(hexToBytes(sk as Hex)) : null;
		console.log(pubKey);
		if (step !== 1 || processing || !signer || !$signerAddress || !pubKey) return;
		processing = true;
		try {
			await signAddKey($wagmiConfig, signer, bytesToHex(pubKey));
			keyAdded = true;
		} finally {
			processing = false;
		}
		window.alert("add key");
	};

	const tryClaimFname = async () => {
		if (step !== 2) return;
		window.alert("claim fname");
	};

	const hoverElement = (element) => {
		if (element.target.id === "edKey") {
			edHover = true;
		}
		if (element.target.id === "ethKey") {
			ethHover = true;
		}
	};

	const leaveElement = (event) => {
		if (event.target.id === "edKey") {
			edHover = false;
		}
		if (event.target.id === "ethKey") {
			ethHover = false;
		}
	}

</script>

{#if $type === "string"}
	<div class="flex flex-col mx-auto p-4 rounded-xl bg-base-200 items-center">

		<p class="text p-2"><b>ed25519 Signer Key (Copy this somewhere safe)</b></p>
		<pre id="edKey" onmouseleave={leaveElement} onmouseenter={hoverElement} class="textarea w-1/2 mx-auto text-center overflow-auto" contenteditable="false">{edValue}</pre>

		<div class="divider mx-auto w-1/2"></div>

		<p class="text p-2"><b>ETH Secret key (Copy this somewhere safe if you want to manage the fid in future)</b></p>
		<pre id="ethKey" onmouseleave={leaveElement} onmouseenter={hoverElement}  class="textarea w-1/2 mx-auto text-center overflow-auto">{ethValue}</pre>

		<div class="divider mx-auto w-1/2"></div>

		<p class="text p-2"><b>Your to-be-registred ETH address:</b></p>
		<pre class="textarea w-1/2 mx-auto text-center overflow-auto">{ethAddress}</pre>

		<div class="divider mx-auto w-1/2"></div>

		<ul class="steps mx-auto">
			<li class={step >= 0 ? filledStep : unfilledStep}><button class={step === 0 ? filledBtn : unfilledBtn} onclick={tryRegister} disabled={processing}>Register fid</button></li>
			<li class={step >= 1 ? filledStep : unfilledStep}><button class={step === 1 ? filledBtn : unfilledBtn} onclick={tryAddKey} disabled={processing}>Add signing key</button></li>
			<li class={step >= 2 ? filledStep : unfilledStep}><button class={step === 2 ? filledBtn : unfilledBtn} onclick={tryClaimFname} disabled={processing}>Claim fname</button></li>
		</ul>

	</div>
{/if}