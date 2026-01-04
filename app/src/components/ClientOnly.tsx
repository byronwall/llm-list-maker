import { Show, createSignal, onMount, type JSX } from "solid-js";

export function ClientOnly(props: {
  children: JSX.Element;
  fallback?: JSX.Element;
}) {
  const [mounted, setMounted] = createSignal(false);

  onMount(() => setMounted(true));

  return (
    <Show when={mounted()} fallback={props.fallback}>
      {() => props.children}
    </Show>
  );
}
