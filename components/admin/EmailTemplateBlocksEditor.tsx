"use client";

import type { EmailTemplateBlock } from "@/types";
import { ContentBlocksEditor } from "./ContentBlocksEditor";

const EMAIL_VARIABLES = [
  "name",
  "userName",
  "providerName",
  "packageName",
  "amount",
  "bookingDate",
  "exploreUrl",
  "bookingUrl",
  "verifyUrl",
  "resetUrl",
  "logoUrl",
];

/** Email-specific wrapper around the shared visual blocks builder. */
export function EmailTemplateBlocksEditor({
  blocks,
  onChange,
}: {
  blocks: EmailTemplateBlock[];
  onChange: (blocks: EmailTemplateBlock[]) => void;
}) {
  return <ContentBlocksEditor blocks={blocks} onChange={onChange} variables={EMAIL_VARIABLES} />;
}
