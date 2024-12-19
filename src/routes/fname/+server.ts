import { json } from "@sveltejs/kit";

export interface RegisterResponse {
	success: boolean,
}

export interface RegisterRequest {
	name: string, // Name to register
	from: number,  // Fid to transfer from (0 for a new registration)
	to: number, // Fid to transfer to (0 to unregister)
	fid: number, // Fid making the request (must match from or to)
	owner: `0x${string}`, // Custody address of fid making the request
	timestamp: number,  // Current timestamp in seconds
	signature: `0x${string}`  // EIP-712 signature signed by the custody address of the fid
}

const BASE_FNAME_URL = "https://fnames.farcaster.xyz/transfers";

export async function POST({ request }) {

	const jsonRequest = await request.json();

	console.log(jsonRequest);

	const response = await fetch(BASE_FNAME_URL, {
		method: "POST",
		body: JSON.stringify(jsonRequest),
		headers: {
			"Content-Type": "application/json",
			"Accept": "application/json",
		}
	});

	console.log(response.ok);

	return json({ success: response.ok }, { status: 200 });
}