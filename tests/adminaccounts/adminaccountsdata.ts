export const adminAccountsData = {
  navigation: {
    adminAccountsLink: "Admin Accounts",
    profileManagementLink: "Profile Management",
    fleetManagementLink: "Fleet Management",
    androidDeviceListLink: "Android Device List",
    configurationLink: "Configuration",
    wifiNetworksLink: "Wi-Fi Networks",
  },

  labels: {
    wifiLabel: "Automation Wifi",
  },

  sortColumns: {
    name: "Name",
    email: "Email",
  },

  roleFilters: [
    "Super Administrator",
    "Administrator",
    "Manager",
    "Supervisor",
    "Regional Administrator",
    "Extended Regional Administrator",
    "Local Administrator",
    "User",
    "Integrator",
    "Extended Integrator",
    "Service Center",
    "Extended Service Center",
  ],

  users: {
    superAdmin: {
      firstName: "Play",
      lastName: "Wright",
      emailPrefix: "alfiekinnies+",
      emailDomain: "@gmail.com",
      password: "PLaywright123!",
      role: "Super Administrator",
    },

    regionalAdmin: {
      firstName: "Play",
      lastName: "Wright",
      emailPrefix: "alfiekinnies+regional",
      emailDomain: "@gmail.com",
      password: "PLaywright123!",
      role: "REGIONAL_ADMINISTRATOR",
      label: "Automation Label",
      profileLabel: "Test Profile Label",
    },
  },
} as const;

export type UserType = keyof typeof adminAccountsData.users;
export type RoleFilter = (typeof adminAccountsData.roleFilters)[number];
