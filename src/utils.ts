import { encodeAbiParameters, type Account, type Hex } from 'viem';
import { getEip712Domain } from 'viem/actions';
import { type Config, readContract, waitForTransactionReceipt, writeContract } from '@wagmi/core';
import { optimism } from 'viem/chains';
import { abi as idAbi } from './idGateway';
import { abi as keyAbi } from './keyGateway';
import { abi as registryAbi } from './idRegistry';
import { abi as keyRegistryAbi } from "./keyRegistry";
import type { RegisterRequest, RegisterResponse } from './routes/fname/+server';

const ID_GATEWAY_ADDRESS: Hex = '0x00000000Fc25870C6eD6b6c7E41Fb078b7656f69';
const ID_REGISTRY_ADDRESS: Hex = '0x00000000Fc6c5F01Fc30151999387Bb99A9f489b';
const KEY_GATEWAY_ADDRESS: Hex = '0x00000000fC56947c7E7183f8Ca4B62398CaAdf0B';
const KEY_REGISTRY_ADDRESS: Hex = "0x00000000Fc1237824fb747aBDE0FF18990E59b7e";
const KEY_REQUEST_VALIDATOR_ADDRESS: Hex = '0x00000000FC700472606ED4fA22623Acf62c60553';

const EIP_712_USERNAME_PROOF = [
	{ name: "name", type: "string" },
	{ name: "timestamp", type: "uint256" },
	{ name: "owner", type: "address" },
];

const EIP_712_USERNAME_DOMAIN = {
	name: "Farcaster name verification",
	version: "1",
	chainId: 1,
	verifyingContract: "0xe3Be01D99bAa8dB9905b33a3cA391238234B79D1" as Hex,
};

const USERNAME_PROOF_EIP_712_TYPES = {
	domain: EIP_712_USERNAME_DOMAIN,
	types: { UserNameProof: EIP_712_USERNAME_PROOF },
};

export const getFid = async (config: Config, ownerAddress: Hex) => {
	return (await readContract(config, {
		abi: registryAbi,
		address: ID_REGISTRY_ADDRESS,
		functionName: 'idOf',
		args: [ownerAddress]
	})) as bigint;
};

export const keyRegistered = async (config: Config, fid: bigint, ed25519Key: Hex) => {
	const [state] = await readContract(config, {
		abi: keyRegistryAbi,
		address: KEY_REGISTRY_ADDRESS,
		functionName: "keys",
		args: [fid, ed25519Key]
	}) as number[];
	return state == 1; // KeyState.ADDED
}

const getNonce = async (
	config: Config,
	gatewayAddress: Hex,
	ownerAddress: Hex
): Promise<bigint> => {
	return await readContract(config, {
		chainId: optimism.id,
		address: gatewayAddress,
		abi: [
			{
				inputs: [{ internalType: 'address', name: 'owner', type: 'address' }],
				name: 'nonces',
				outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
				stateMutability: 'view',
				type: 'function'
			}
		],
		functionName: 'nonces',
		args: [ownerAddress]
	});
};

export const signOnboarding = async (
	config: Config,
	signer: Account,
	recovery: Hex
): Promise<bigint> => {
	const nonce = await getNonce(config, ID_GATEWAY_ADDRESS, signer.address);
	const deadline = BigInt(Math.round(Date.now() / 1000) + 36000000);

	const client = config.getClient({
		chainId: optimism.id
	});

	const newFidAddress = signer.address;

	return await getEip712Domain(client, {
		address: ID_GATEWAY_ADDRESS
	})
		.then(async (domain) => {
			return signer.signTypedData?.({
				domain: {
					name: domain.domain.name,
					verifyingContract: domain.domain.verifyingContract,
					version: domain.domain.version,
					chainId: domain.domain.chainId
				},
				types: {
					Register: [
						{ name: 'to', type: 'address' },
						{ name: 'recovery', type: 'address' },
						{ name: 'nonce', type: 'uint256' },
						{ name: 'deadline', type: 'uint256' }
					]
				},
				primaryType: 'Register',
				message: {
					to: newFidAddress,
					recovery,
					nonce,
					deadline
				}
			});
		})
		.then(async (signature) => {
			const price: bigint = (await readContract(config, {
				address: ID_GATEWAY_ADDRESS,
				abi: idAbi,
				functionName: 'price',
				args: []
			})) as bigint;
			return { price, signature };
		})
		.then(async ({ signature, price }): Promise<bigint> => {
			const hash = await writeContract(config, {
				abi: idAbi,
				address: ID_GATEWAY_ADDRESS,
				functionName: 'registerFor',
				args: [newFidAddress, recovery, deadline, signature],
				value: price
			});

			await waitForTransactionReceipt(config, {
				hash,
				confirmations: 1
			});

			return getFid(config, signer.address);
		});
};

const metadataTypes = [
	{
		components: [
			{
				name: 'requestFid',
				type: 'uint256'
			},
			{
				name: 'requestSigner',
				type: 'address'
			},
			{
				name: 'signature',
				type: 'bytes'
			},
			{
				name: 'deadline',
				type: 'uint256'
			}
		],
		name: 'SignedKeyRequestMetadata',
		type: 'tuple'
	}
];

export const signAddKey = async (
	config: Config,
	signer: Account,
	ed25519PubKey: Hex
): Promise<boolean> => {
	const signerAddress = signer.address;
	const client = config.getClient({
		chainId: optimism.id
	});

	const fid = await getFid(config, signerAddress);
	const deadline = BigInt(Math.round(Date.now() / 1000) + 36000000);

	const validatorDomain = {
		name: 'Farcaster SignedKeyRequestValidator',
		version: '1',
		chainId: 10,
		verifyingContract: KEY_REQUEST_VALIDATOR_ADDRESS
	};

	const keyGatewayDomain = {
		name: 'Farcaster KeyGateway',
		version: '1',
		chainId: 10,
		verifyingContract: KEY_GATEWAY_ADDRESS
	};

	const metadataSignature = await signer.signTypedData?.({
		domain: validatorDomain,
		types: {
			SignedKeyRequest: [
				{ name: 'requestFid', type: 'uint256' },
				{ name: 'key', type: 'bytes' },
				{ name: 'deadline', type: 'uint256' }
			]
		},
		primaryType: 'SignedKeyRequest',
		message: {
			requestFid: fid,
			key: ed25519PubKey,
			deadline
		}
	});

	const metadataStruct = {
		requestFid: fid,
		requestSigner: signerAddress,
		signature: metadataSignature,
		deadline
	};

	const nonce = await getNonce(config, KEY_GATEWAY_ADDRESS, signerAddress);

	const metadataBytes = encodeAbiParameters(metadataTypes, [metadataStruct]);

	const addSignature = await signer.signTypedData?.({
		domain: keyGatewayDomain,
		types: {
			Add: [
				{ name: 'owner', type: 'address' },
				{ name: 'keyType', type: 'uint32' },
				{ name: 'key', type: 'bytes' },
				{ name: 'metadataType', type: 'uint8' },
				{ name: 'metadata', type: 'bytes' },
				{ name: 'nonce', type: 'uint256' },
				{ name: 'deadline', type: 'uint256' }
			]
		},
		primaryType: 'Add',
		message: {
			owner: signerAddress,
			keyType: 1, // ed25519 signer key
			key: ed25519PubKey,
			metadataType: 1, // metadata type signed
			metadata: metadataBytes,
			nonce,
			deadline
		}
	});

	const hash = await writeContract(config, {
		address: KEY_GATEWAY_ADDRESS,
		abi: keyAbi,
		functionName: 'addFor',
		args: [
			signerAddress,
			1, //ed25519 signer key type
			ed25519PubKey,
			1, // metadata type signed
			metadataBytes,
			deadline,
			addSignature
		]
	});

	await waitForTransactionReceipt(config, {
		hash,
		confirmations: 1
	});

	return true;
};


export const signFname = async (config: Config, signer: Account, fname: string): Promise<string|null> => {

	const signerAddress = signer.address;

	const fid = await getFid(config, signerAddress);
	const timestamp = Math.round(Date.now() / 1000);

	const signature = await signer.signTypedData?.({
		domain: EIP_712_USERNAME_DOMAIN,
		types: USERNAME_PROOF_EIP_712_TYPES.types,
		primaryType: "UserNameProof",
		message: {
			name: fname,
			owner: signerAddress,
			timestamp,
		}
	});

	if (!signature) {
		throw new Error("Failed to sign fname");
	}

	const requestData: RegisterRequest = {
		name: fname, // Name to register
		from: 0,  // Fid to transfer from (0 for a new registration)
		to: Number(fid), // Fid to transfer to (0 to unregister)
		fid: Number(fid), // Fid making the request (must match from or to)
		owner: signerAddress, // Custody address of fid making the request
		timestamp,  // Current timestamp in seconds
		signature  // EIP-712 signature signed by the custody address of the fid
	}

	const response: RegisterResponse = await (await fetch("/fname", {
		body: JSON.stringify(requestData),
		method: "POST",
		headers: {
			"Content-Type": "application/json"
		}
	})).json();

	return response.success ? fname : null;
}