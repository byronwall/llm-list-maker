import { Box, HStack } from "styled-system/jsx";
import { css } from "styled-system/css";
import * as ToggleGroup from "~/components/ui/toggle-group";

import type { ProjectBoardViewMode } from "./project-board-url-state";

const items: {
  value: ProjectBoardViewMode;
  label: string;
}[] = [
  { value: "board", label: "Board" },
  { value: "split", label: "Split" },
  { value: "overview", label: "Overview" },
  { value: "table", label: "Table" },
];

export function ProjectBoardViewToggle(props: {
  value: ProjectBoardViewMode;
  onChange: (next: ProjectBoardViewMode) => void;
}) {
  return (
    <HStack gap="3" flexWrap="wrap">
      <ToggleGroup.Root
        value={props.value}
        onValueChange={(details: any) => {
          const v = String(details?.value ?? "") as ProjectBoardViewMode;
          if (!v) return;
          props.onChange(v);
        }}
        class={css({
          bg: "bg.muted",
          borderWidth: "1px",
          borderColor: "border",
          rounded: "lg",
          p: "1",
        })}
      >
        {items.map((it) => (
          <ToggleGroup.Item
            value={it.value}
            class={css({
              display: "inline-flex",
              alignItems: "center",
              gap: "2",
              px: "3",
              py: "1.5",
              rounded: "md",
              fontSize: "sm",
              fontWeight: "medium",
              userSelect: "none",
              transitionProperty: "background-color, color, box-shadow",
              transitionDuration: "120ms",
              _hover: { bg: "gray.subtle.bg.hover" },
              _focusVisible: {
                outline: "2px solid",
                outlineColor: "colorPalette.solid",
                outlineOffset: "2px",
              },
              "&[data-state=on]": {
                bg: "bg.default",
                boxShadow: "sm",
              },
            })}
          >
            <Box>{it.label}</Box>
          </ToggleGroup.Item>
        ))}
      </ToggleGroup.Root>
    </HStack>
  );
}


