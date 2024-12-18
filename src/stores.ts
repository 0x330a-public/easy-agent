
import {persisted} from "svelte-persisted-store";

export const edSk = persisted("edSk", "0x", {
	storage: "local"
});

export const ethSk = persisted("ethSk", "0x", {
	storage: "local"
})