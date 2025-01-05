<script lang="ts">

	import { edSk, ethMnemonic } from '../stores';

	import { derived as storeDerive, get } from 'svelte/store';

	import { signerAddress, wagmiConfig } from 'svelte-wagmi';

	import * as ed from '@noble/ed25519';
	import { sha512 } from "@noble/hashes/sha512";
	ed.etc.sha512Sync = (...m) => sha512(ed.etc.concatBytes(...m));

	import { bytesToHex, type Hex, hexToBytes } from 'viem';
	import { browser } from '$app/environment';
	import { english, generateMnemonic, generatePrivateKey, mnemonicToAccount, privateKeyToAccount } from 'viem/accounts';
	import { getFid, keyRegistered, signAddKey, signFname, signOnboarding } from '../utils';
	import { copy } from "svelte-copy";

	const generateNew = () => {
		const newValue = ed.utils.randomPrivateKey();
		edSk.set(bytesToHex(newValue));
	}

	const generateEth = () => {
		const mnemonic = generateMnemonic(english)
		ethMnemonic.set(mnemonic);
	}

	if (browser) {
		if (get(edSk) === "0x") {
			generateNew();
		}
		if (get(ethMnemonic) === "") {
			generateEth();
		}
	}

	const type = storeDerive(edSk, (value) => typeof(value));

	let fid = $state(0n);
	let fname = $state("");
	let keyAdded = $state(false);
	let showToast = $state(false);

	let step = $derived.by(()=> {
		const hasFid = fid !== 0n ? 1 : 0;
		const hasKey = keyAdded ? 1 : 0;
		return hasFid + hasKey;
	});

	let edHover = $state(false);
	let ethHover = $state(false);

	let processing = $state(false);

	const edValue = $derived(edHover ? get(edSk) : "*".repeat(get(edSk).length));

	const ethValue = $derived(ethHover ? get(ethMnemonic) : "**** ".repeat(get(ethMnemonic).split(" ").length));

	// const ethSigner = storeDerive(ethSk, (secretKey) => secretKey !== "0x" ? privateKeyToAccount(secretKey as Hex) : null);
	const ethSigner = storeDerive(ethMnemonic, (mnemonic) => mnemonic !== "" ? mnemonicToAccount(mnemonic) : null);
	const ethAddress = $derived($ethSigner?.address || "0x");

	$effect(() => {
		const address = ethAddress;
		const config = $wagmiConfig;
		if (address && config && !processing) {
			getFid(config, address as Hex).then((value) => {
				fid = value;
			});
		} else {
			fid = 0n;
		}
	});

	$effect(() => {
		const address = ethAddress;
		const config = $wagmiConfig;
		const sk = get(edSk);
		const pubKey = sk && sk !== "0x" ? ed.getPublicKey(hexToBytes(sk as Hex)) : null;
		if (address && config && !processing && fid > 0 && pubKey) {
			keyRegistered(config, fid, bytesToHex(pubKey)).then((value) => {
				keyAdded = value;
			})
		}

	});

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
		console.log(bytesToHex(pubKey!));
		if (step !== 1 || processing || !signer || !$signerAddress || !pubKey) return;
		processing = true;
		try {
			await signAddKey($wagmiConfig, signer, bytesToHex(pubKey));
		} finally {
			processing = false;
		}
	};

	const tryClaimFname = async () => {
		const signer = $ethSigner;
		if (step < 2 || fname === "" || !signer) return;
		processing = true;
		try {
			const result = (await signFname($wagmiConfig, signer, fname));
			console.log(result);
			if (!result) {
				processing = false;
			} else {
				showToast = true;
				setTimeout(() => {
					showToast = false;
				}, 2000);
			}
		} catch (e) {
			console.error(e);
			processing = false;
			// if success don't worry about stopping the "processing" flag ig
		}
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

{#if showToast}
<div class="toast toast-top toast-center">
	<div class="alert alert-success">
		<span>fname {fname} registered successfully</span>
	</div>
</div>
{/if}

{#if $type === "string"}
	<div class="flex flex-col mx-auto p-4 rounded-xl bg-base-200 items-center">

		<p class="text p-2"><b>ed25519 Signer Key (Copy this somewhere safe)</b></p>
		<pre id="edKey" onmouseleave={leaveElement} onmouseenter={hoverElement} use:copy={edValue} class="textarea w-1/2 mx-auto text-center overflow-auto" contenteditable="false">{edValue}</pre>

		<div class="divider mx-auto w-1/2"></div>

		<p class="text p-2"><b>ETH Seed Phrase (Copy this somewhere safe if you want to manage the fid in future)</b></p>
		<pre id="ethKey" onmouseleave={leaveElement} onmouseenter={hoverElement} use:copy={ethValue} class="textarea w-1/2 mx-auto text-center overflow-auto">{ethValue}</pre>

		<div class="divider mx-auto w-1/2"></div>

		<p class="text p-2"><b>Your to-be-registred ETH address:</b></p>
		<pre class="textarea w-1/2 mx-auto text-center overflow-auto">{ethAddress}</pre>

		<div class="divider mx-auto w-1/2"></div>

		{#if step >= 2}
			<input class="input input-primary mx-auto my-2" placeholder="username to claim here" bind:value={fname}/>
		{/if}

		<ul class="steps mx-auto">
			<li class={step >= 0 ? filledStep : unfilledStep}><button class={step === 0 ? filledBtn : unfilledBtn} onclick={tryRegister} disabled={processing}>Register fid</button></li>
			<li class={step >= 1 ? filledStep : unfilledStep}><button class={step === 1 ? filledBtn : unfilledBtn} onclick={tryAddKey} disabled={processing}>Add signing key</button></li>
			<li class={step >= 2 ? filledStep : unfilledStep}><button class={step === 2 ? filledBtn : unfilledBtn} onclick={tryClaimFname} disabled={processing}>Claim fname</button></li>
		</ul>

	</div>
{/if}