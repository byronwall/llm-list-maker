import { Box, HStack } from "styled-system/jsx";
import { css } from "styled-system/css";
import { XIcon } from "lucide-solid";
import { IconButton } from "~/components/ui/icon-button";
import { Input } from "~/components/ui/input";
import * as Select from "~/components/ui/select";

import type { ProjectBoardListSort } from "./project-board-url-state";

const sortItems = [
  { label: "Last updated", value: "updated" as const },
  { label: "Alphabetical", value: "alpha" as const },
  { label: "Most items", value: "items" as const },
];

export function ProjectBoardViewControls(props: {
  q: string;
  setQ: (next: string) => void;
  sort: ProjectBoardListSort;
  setSort: (next: ProjectBoardListSort) => void;
  compact?: boolean;
}) {
  const isCompact = () => !!props.compact;
  return (
    <HStack gap="2" flexWrap="wrap" alignItems="center">
      <Box
        class={css({
          position: "relative",
          flex: isCompact() ? "0" : "1",
          minW: isCompact() ? "220px" : "260px",
          maxW: isCompact() ? "360px" : "none",
        })}
      >
        <Input
          value={props.q}
          size={isCompact() ? "sm" : undefined}
          placeholder={isCompact() ? "Search…" : "Search lists (and item text)…"}
          onInput={(e) => props.setQ(e.currentTarget.value)}
          class={css({ pr: "9" })}
        />
        <Box
          class={css({
            position: "absolute",
            right: "1.5",
            top: isCompact() ? "1.5" : "2",
          })}
        >
          <IconButton
            size="xs"
            variant="plain"
            aria-label="Clear search"
            disabled={!props.q.trim()}
            onClick={() => props.setQ("")}
          >
            <XIcon />
          </IconButton>
        </Box>
      </Box>

      <Select.Root
        items={sortItems}
        value={[props.sort]}
        size={isCompact() ? "sm" : "md"}
        onValueChange={(details: Select.ValueChangeDetails<any>) => {
          const v = String(details.value?.[0] ?? "") as ProjectBoardListSort;
          if (!v) return;
          props.setSort(v);
        }}
        positioning={{ sameWidth: true }}
      >
        <Select.Control>
          <Select.Trigger class={css({ minW: isCompact() ? "170px" : "210px" })}>
            <Select.ValueText placeholder="Sort…" />
            <Select.Indicator />
          </Select.Trigger>
        </Select.Control>
        <Select.Positioner>
          <Select.Content>
            <Select.List>
              {sortItems.map((it) => (
                <Select.Item item={it}>
                  <Select.ItemText>{it.label}</Select.ItemText>
                  <Select.ItemIndicator />
                </Select.Item>
              ))}
            </Select.List>
          </Select.Content>
        </Select.Positioner>
        <Select.HiddenSelect />
      </Select.Root>
    </HStack>
  );
}


