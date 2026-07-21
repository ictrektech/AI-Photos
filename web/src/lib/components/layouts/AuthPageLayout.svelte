<script lang="ts">
  import { Card, CardBody, CardHeader, Heading, VStack } from '@immich/ui';
  import type { Snippet } from 'svelte';
  interface Props {
    title?: string;
    children?: Snippet;
    withHeader?: boolean;
    withBackdrop?: boolean;
  }

  let { title, children, withHeader = true }: Props = $props();
</script>

<section class="min-w-dvw flex min-h-dvh items-center justify-center relative">
  <Card color="secondary" class="w-full max-w-xl border m-2">
    {#if withHeader}
      <CardHeader class="mt-6">
        <VStack>
          <Heading size="large" class="font-semibold" color="primary" tag="h1">{title}</Heading>
        </VStack>
      </CardHeader>
    {/if}

    <CardBody class="p-8">
      {@render children?.()}
    </CardBody>
  </Card>
</section>
