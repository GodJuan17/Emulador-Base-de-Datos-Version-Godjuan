import type { AttributeMark } from "../../model";

export type DraftAttribute = {
  name: string;
  type: string;
  primaryKey: boolean;
  alternateKey: boolean;
  unique: boolean;
  required: boolean;
  kind: "simple" | AttributeMark["kind"];
  parts: string;
  domain: string;
  originalName?: string;
};
