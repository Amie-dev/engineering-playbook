import { webSearch } from "./web-search.js";
import { calculator } from "./calculator.js";
import { queryDatabase } from "./database.js";
import { fileReader } from "./file-reader.js";
import { invoiceCreator } from "./invoice-creator.js";

const tools = {
  web_search: webSearch,
  calculator: calculator,
  query_database: queryDatabase,
  read_file: fileReader,
  create_invoice: invoiceCreator,
};

export async function executeTool(name, args) {
  const fn = tools[name];
  if (!fn) {
    return { error: `Unknown tool: ${name}` };
  }

  try {
    const result = await fn(args);
    return result;
  } catch (err) {
    return { error: `Tool "${name}" failed: ${err.message}` };
  }
}

export function getToolNames() {
  return Object.keys(tools);
}
