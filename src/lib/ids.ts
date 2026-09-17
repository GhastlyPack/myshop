import { customAlphabet } from "nanoid";

const alphabet = "0123456789abcdefghijklmnopqrstuvwxyz";
const nano = customAlphabet(alphabet, 16);
const long = customAlphabet(alphabet + "ABCDEFGHIJKLMNOPQRSTUVWXYZ", 40);

/** Prefixed, sortable-enough ids: usr_..., sto_..., prd_... */
export function newId(prefix: string) {
  return `${prefix}_${nano()}`;
}

/** Unguessable token for download links / magic links. */
export function newToken() {
  return long();
}
