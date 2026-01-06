export function generateUniqueProfileName(prefix: string): string {
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 7);
  return `${prefix}-${timestamp}-${randomSuffix}`;
}

export const ProfileData = {
  profiles: {
    apps: "Playwright Apps",
    cope: "Playwright COPE",
    singleKiosk: (timestamp: string) => `Playwright Single Kiosk ${timestamp}`,
    name: "Playwright Test Profile",
    enrollment: (timestamp: string) => `Playwright Enrollment ${timestamp}`,
    type: "Fully managed",
  },

  applications: {
    slack: "slack",
    wizyVision: "wizyvision",
    appRowWizyVision: "io.wizy.wizyvision",
    knoxKpu: "com.samsung.android.knox.kpu",
  },

  installTypes: ["Available", "Force Installed", "Preinstalled"],

  playStoreModes: {
    work: [
      "Open Play Store",
      "Restricted Play Store",
      "Multi-Application Kiosk",
    ],
    personal: ["Restricted Play Store", "Open Play Store"],
  },

  permissionStates: ["Unspecified", "Deny", "Grant", "Prompt"],

  permissions: {
    camera: "Take pictures and videos",
    offlineMode: "Enabled Offline Mode",
  },

  tracks: ["Closed testing - Wizy", "beta", "alpha", "Production"],

  advancedPermissions: [
    "Manage certificatesGrants",
    "Manage configurationsGrants",
    "Block uninstallationGrants",
    "Permission stateGrants access",
    "Package access stateGrants access",
    "Enable system appsGrants",
  ],

  profileTypes: {
    fullyManaged: "Fully-managed For company-",
    copeProfile: "Company-owned with work profile",
  },

  enrollmentSettings: {
    locales: {
      afrikaans: "Afrikaans (NA)",
      english: "English (US)",
      french: "French (FR)",
    },

    timezones: {
      africaAbidjan: "Africa/Abidjan",
      utc: "UTC",
      americaNewYork: "America/New_York",
    },

    labels: {
      enrollmentToken: "Enrollment Token",
      regenerate: "Regenerate",
      enableSystemApps: "Enable system applications",
      useMobileData: "Use Mobile Data",
      wifiHidden: "Wi-Fi Hidden",
    },
  },

  configuration: {
    switches: {
      deviceGeolocation: "Enable device geolocation",
      reportGeolocation: "Report Device Geolocation",
      advancedDeviceStatus: "Enable advanced device status update",
      deviceUsage: "Enable device usage",
    },

    dropdowns: {
      locationMode: {
        label: "Location mode",
        options: [
          "Let the user choose",
          "Enforced",
          "Battery Saving",
          "High Accuracy",
          "Sensors Only",
        ],
      },

      systemUpdates: {
        label: "Manage system updates policy",
        options: ["Unspecified", "Automatic", "Postponed"],
      },

      passwordConstraints: {
        label: "Password Constraints",
        options: ["Complex", "Alphanumeric"],
      },
    },

    security: {
      keyguard: {
        disableAllCustomizations: "Disable all customizations",
      },

      factoryResetProtection: {
        emailPrefix: "alfiekinnies",
        emailDomain: "gmail.com",
      },

      generateFactoryResetEmail(): string {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 7);
        return `${this.factoryResetProtection.emailPrefix}+${timestamp}-${random}@${this.factoryResetProtection.emailDomain}`;
      },

      passwordSettings: {
        historyLength: "Password History LengthNumber",
        maxFailedPasswords: "Maximum failed passwords for",
      },
    },

    dropdownSelectors: {
      standard: {
        container: "li.ant-list-item",
        inner: ".ant-select-selector",
      },
    },
  },

  kiosk: {
    tracks: ["Production", "Delta", "alpha", "Gamma"],

    navigationButtons: ["Enabled", "Disabled", "Home button only"],

    powerButton: ["Available", "Blocked"],

    displayError: ["Enabled", "Muted"],

    statusBarInfo: [
      "Notifications and system information",
      "Only system information",
      "None",
    ],

    generateRandomColor(): string {
      return (
        "#" +
        Math.floor(Math.random() * 16777215)
          .toString(16)
          .padStart(6, "0")
      );
    },
  },

  policies: {
    bluetoothPolicy: "Set blue",
    cameraDisabled: "Camera disabled",
  },
};

export const IntegrationTestData = {
  profileName: "Playwright FM",

  searchTerms: {
    bluetooth: "bluetooth",
  },

  zebraSettings: {
    bluetoothConfiguration: "Bluetooth Configuration",
  },

  knoxSettings: {
    advancedRestrictionPolicies: "Advanced Restriction policies (Premium)",
  },

  successMessages: {
    profileUpdated: "has been updated",
  },
} as const;
