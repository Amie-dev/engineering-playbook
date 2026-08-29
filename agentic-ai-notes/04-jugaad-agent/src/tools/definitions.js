export const toolDefinitions = [
  {
    type: "function",
    function: {
      name: "web_search",
      description: "Search the web for current information about a topic",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search query" },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "calculator",
      description: "Perform math operations: add, subtract, multiply, divide, percentage",
      parameters: {
        type: "object",
        properties: {
          operation: { type: "string", enum: ["add", "subtract", "multiply", "divide", "percentage"] },
          a: { type: "number", description: "First number" },
          b: { type: "number", description: "Second number" },
        },
        required: ["operation", "a", "b"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "query_database",
      description: "Query MongoDB for inventory items or customer records",
      parameters: {
        type: "object",
        properties: {
          collection: { type: "string", enum: ["inventory", "customers"] },
          filter: { type: "object", description: "MongoDB filter object" },
          limit: { type: "number", description: "Max results to return" },
        },
        required: ["collection"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "read_file",
      description: "Read contents of a local file",
      parameters: {
        type: "object",
        properties: {
          filename: { type: "string", description: "Path to the file" },
        },
        required: ["filename"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_invoice",
      description: "Generate an invoice for a customer order",
      parameters: {
        type: "object",
        properties: {
          customerName: { type: "string" },
          items: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                quantity: { type: "number" },
                price: { type: "number" },
              },
              required: ["name", "quantity", "price"],
            },
          },
          gstPercent: { type: "number", description: "GST percentage (default 18)" },
        },
        required: ["customerName", "items"],
      },
    },
  },
];
