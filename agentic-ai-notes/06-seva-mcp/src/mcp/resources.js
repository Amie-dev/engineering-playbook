export const mcpResources = [
  {
    uri: "seva://templates/ticket",
    name: "Ticket Template",
    description: "Standard template for creating citizen service tickets",
    mimeType: "application/json",
    content: JSON.stringify({
      citizenName: "",
      category: "Select: food-security, health, housing, education, civil-registration, social-welfare, agriculture",
      description: "Describe the issue or service needed",
      priority: "normal",
    }, null, 2),
  },
  {
    uri: "seva://kb/categories",
    name: "Service Categories",
    description: "List of available government service categories",
    mimeType: "application/json",
    content: JSON.stringify([
      { id: "food-security", name: "Food Security", examples: "Ration card, food subsidy" },
      { id: "health", name: "Health", examples: "Ayushman Bharat, health card" },
      { id: "housing", name: "Housing", examples: "PM Awas Yojana, housing subsidy" },
      { id: "education", name: "Education", examples: "Scholarships, fee waivers" },
      { id: "civil-registration", name: "Civil Registration", examples: "Birth/death/caste certificates" },
      { id: "social-welfare", name: "Social Welfare", examples: "Pension, widow support" },
      { id: "agriculture", name: "Agriculture", examples: "PM Kisan, crop insurance" },
    ], null, 2),
  },
];
