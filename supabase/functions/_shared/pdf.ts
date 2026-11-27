// The PDF text reader the importer hands to the `pdf-jobs` adapter (see adapters.ts).
//
// Kept in its own file because it imports a library: only the importer (Deno, ingest-jobs) loads
// it. Tests and scripts that run in Node register their own reader instead.
import { extractText, getDocumentProxy } from 'npm:unpdf@1.9.1';

export async function readPdfText(bytes: Uint8Array): Promise<string> {
  const pdf = await getDocumentProxy(bytes);
  const { text } = await extractText(pdf, { mergePages: true });
  return text;
}
