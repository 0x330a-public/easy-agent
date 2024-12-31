
import {persisted} from "svelte-persisted-store";

export const edSk = persisted("edSk", "0x", {
	storage: "local"
});

export const ethMnemonic = persisted("ethMnemonic", "", {
	storage: "local"
})