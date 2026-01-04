import { css } from "styled-system/css";

export const loadingClass = css({ color: "fg.muted" });

export const boardGridClass = css({
  display: "grid",
  gridTemplateColumns: {
    base: "1fr",
    md: "repeat(2, minmax(0, 1fr))",
    xl: "repeat(3, minmax(0, 1fr))",
  },
  gap: "3",
  alignItems: "start",
  pb: "2",
});

export const columnShellClass = (isDragTarget: boolean) =>
  css({
    width: "100%",
    minW: 0,
    rounded: "lg",
    overflow: "hidden",
    bg: isDragTarget ? "gray.surface.bg.hover" : "gray.surface.bg",
    borderWidth: "1px",
    borderColor: "border",
    outlineWidth: isDragTarget ? "2px" : "0px",
    outlineStyle: isDragTarget ? "dashed" : "solid",
    outlineOffset: "2px",
    outlineColor: "border.emphasized",
    transitionProperty:
      "outline-color, outline-offset, background-color, border-color",
    transitionDuration: "150ms",
    // Progressive disclosure for list-level affordances.
    "& .colActions": {
      opacity: 0,
      pointerEvents: "none",
      transitionProperty: "opacity",
      transitionDuration: "120ms",
    },
    "& .colHandle": {
      opacity: 0,
      transitionProperty: "opacity",
      transitionDuration: "120ms",
    },
    _hover: {
      borderColor: "border.emphasized",
      "& .colActions": { opacity: 1, pointerEvents: "auto" },
      "& .colHandle": { opacity: 1 },
    },
    _focusWithin: {
      "& .colActions": { opacity: 1, pointerEvents: "auto" },
      "& .colHandle": { opacity: 1 },
    },
  });

export const columnHeaderClass = css({
  px: "3",
  py: "2",
  borderBottomWidth: "1px",
  borderColor: "border",
});

export const columnBodyClass = css({
  px: "3",
  py: "2",
});

export const itemsStackClass = (isDragTarget: boolean) =>
  css({
    display: "flex",
    flexDirection: "column",
    gap: "2",
    rounded: "md",
    bg: isDragTarget ? "gray.surface.bg.hover" : "transparent",
    outlineWidth: isDragTarget ? "2px" : "0px",
    outlineStyle: isDragTarget ? "dashed" : "solid",
    outlineOffset: "2px",
    outlineColor: "border.emphasized",
    transitionProperty: "background-color, outline-color, outline-offset",
    transitionDuration: "150ms",
    minH: "10",
  });

export const itemRowClass = (isDropTarget: boolean, isDragging: boolean) =>
  css({
    position: "relative",
    rounded: "md",
    pl: "2",
    pr: "10",
    py: "2",
    // Keep item cards low-ink: rely on border/outline/hover affordances instead of a filled surface.
    bg: "transparent",
    borderWidth: "1px",
    borderColor: isDropTarget ? "border.emphasized" : "transparent",
    outlineWidth: isDropTarget ? "2px" : "0px",
    outlineColor: "border.emphasized",
    outlineOffset: isDropTarget ? "2px" : "0px",
    transitionProperty:
      "outline-color, outline-offset, background-color, border-color, opacity",
    transitionDuration: "150ms",
    opacity: isDragging ? 0.35 : 1,
    // Progressive disclosure for item-level affordances.
    "& .itemActions": {
      position: "absolute",
      right: "2",
      top: "2",
      display: "flex",
      alignItems: "center",
      gap: "1",
      rounded: "md",
      bg: "gray.surface.bg",
      borderWidth: "1px",
      borderColor: "border",
      p: "0.5",
      opacity: 0,
      pointerEvents: "none",
      transitionProperty: "opacity",
      transitionDuration: "120ms",
    },
    "& .itemHandle": {
      opacity: 0,
      transitionProperty: "opacity",
      transitionDuration: "120ms",
    },
    _hover: {
      bg: "transparent",
      borderColor: isDropTarget ? "border.emphasized" : "border",
      "& .itemActions": { opacity: 1, pointerEvents: "auto" },
      "& .itemHandle": { opacity: 1 },
    },
    _focusWithin: {
      "& .itemActions": { opacity: 1, pointerEvents: "auto" },
      "& .itemHandle": { opacity: 1 },
    },
  });

export const emptyItemsClass = css({
  color: "fg.muted",
  fontSize: "sm",
});
