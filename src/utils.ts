import { type Hex, type PrivateKeyAccount } from 'viem';
import { getEip712Domain } from 'viem/actions';
import { type Config, readContract, waitForTransactionReceipt, writeContract } from '@wagmi/core';
import { optimism } from 'viem/chains';
import { abi as idAbi } from './idGateway';
import { abi as keyAbi } from './keyGateway';
import { abi as registryAbi } from './idRegistry';

const ID_GATEWAY_ADDRESS = '0x00000000Fc25870C6eD6b6c7E41Fb078b7656f69';
const ID_REGISTRY_ADDRESS = '0x00000000Fc6c5F01Fc30151999387Bb99A9f489b';
const KEY_GATEWAY_ADDRESS = '0x00000000fC56947c7E7183f8Ca4B62398CaAdf0B';
const KEY_REQUEST_VALIDATOR_ADDRESS = '0x00000000FC700472606ED4fA22623Acf62c60553';

export const getFid = async (config: Config, ownerAddress: Hex) => {
	return (await readContract(config, {
		abi: registryAbi,
		address: ID_REGISTRY_ADDRESS,
		functionName: 'idOf',
		args: [ownerAddress]
	})) as bigint;
};

const getNonce = async (
	config: Config,
	gatewayAddress: Hex,
	ownerAddress: Hex
): Promise<bigint> => {
	return await readContract(config, {
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
	signer: PrivateKeyAccount,
	recovery: Hex
): Promise<bigint> => {
	const nonce = await getNonce(config, ID_GATEWAY_ADDRESS, signer.address);
	const deadline = BigInt(Math.round(Date.now() / 1000) + 60 * 5); // 5 minutes from now

	const client = config.getClient({
		chainId: optimism.id
	});

	const newFidAddress = signer.address;

	return await getEip712Domain(client, {
		address: ID_GATEWAY_ADDRESS
	})
		.then(async (domain) => {
			console.log('domain', domain);
			return signer.signTypedData({
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

export const signAddKey = async (
	config: Config,
	signer: PrivateKeyAccount,
	ed25519PubKey: Hex
): Promise<boolean> => {
	const signerAddress = signer.address;
	const client = config.getClient();

	const fid = await getFid(config, signerAddress);
	const deadline = BigInt(Math.round(Date.now() / 1000) + 60 * 5);

	const validatorDomain = await getEip712Domain(client, {
		address: KEY_REQUEST_VALIDATOR_ADDRESS
	});

	const signedMetadata = await signer.signTypedData({
		domain: {
			name: validatorDomain.domain.name,
			version: validatorDomain.domain.version,
			verifyingContract: validatorDomain.domain.verifyingContract,
			chainId: validatorDomain.domain.chainId
		},
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

	const keyDomain = await getEip712Domain(client, {
		address: KEY_GATEWAY_ADDRESS
	});

	const addSignature = await signer.signTypedData({
		domain: {
			name: keyDomain.domain.name,
			version: keyDomain.domain.version,
			chainId: keyDomain.domain.chainId,
			verifyingContract: keyDomain.domain.verifyingContract
		},
		types: {
			Add: [
				{ name: 'owner', value: 'address' },
				{ name: 'keyType', value: 'uint32' },
				{ name: 'key', value: 'bytes' },
				{ name: 'metadataType', value: 'uint8' },
				{ name: 'metadata', value: 'bytes' },
				{ name: 'nonce', value: 'uint256' },
				{ name: 'deadline', value: 'uint256' }
			]
		},
		primaryType: 'Add',
		message: {
			owner: signerAddress,
			keyType: 1n, // ed25519 signer key
			key: ed25519PubKey,
			metadataType: 1n, // metadata type signed
			metadata: signedMetadata,
			deadline,
			nonce: 0n
		}
	});

	const hash = await writeContract(config, {
		address: KEY_GATEWAY_ADDRESS,
		abi: keyAbi,
		functionName: 'addFor',
		args: [
			signerAddress,
			1n, //ed25519 signer key type
			ed25519PubKey,
			1n, // metadata type signed
			signedMetadata,
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
