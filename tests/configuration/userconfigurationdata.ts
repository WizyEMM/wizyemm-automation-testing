export const userConfigurationData = {
  navigation: {
    configuration: "Configuration",
    users: "Users",
    wifiNetworks: "Wi-Fi Networks",
    bundledActions: "Bundled Actions",
    advanced: "Advanced",
  },

  user: {
    firstName: "Play",
    lastName: "Wright",
    password: "Playwright123",
    email: "alfiekinnies@gmail.com",
    filterByEmail: "alfiekinnies",
    firstNameEdit: "Play Edit",
    lastNameEdit: "Wright Edit",
    username: "Playwright"
  },

  wifi: {
    name: "Automation-wifi",
    password: "Playwright123",
    securityProtocol: "WEP-PSK",
  },

  bundledActions: {
    name: "Automation-bundled",
    actionType: "Push File",
  },

  manufacturers: [
    "Show Datalogic",
    "Show Honeywell",
    "Show Samsung",
    "Show Urovo",
    "Show Zebra",
  ],

  userTypes: {
    regular: "Regular",
    staging: "Staging",
  } as const,

  filters: {
    byEmail: "Filter by email",
    byName: "Filter by name",
  },
} as const;
