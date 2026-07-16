"use client";

import { Toaster as Sonner, type ToasterProps } from "sonner";
import { useTheme } from "@/providers/theme-provider";

export function Toaster(props: ToasterProps) {
  const { resolvedTheme } = useTheme();
  return <Sonner theme={resolvedTheme} {...props} />;
}
