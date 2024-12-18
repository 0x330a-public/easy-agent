<script lang="ts">
	const props = $props();
	const tooltip = "Disconnect wallet";
</script>

<div class="tooltip tooltip-bottom" data-tip="{tooltip}">
	<button class={props.class} onclick={props.onClick} aria-label="{tooltip}">
		<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="4" stroke="currentColor" class="size-6">
			<path stroke-linecap="round" stroke-linejoin="round" d="M5.636 5.636a9 9 0 1 0 12.728 0M12 3v9" />
		</svg>
	</button>
</div>