export const applicationLogsData = {
  sortColumns: ["Application", "Devices", "Date"],
  filters: {
    error: "Error",
    info: "Info",
  },
  filterSequence: [
    { name: "Error", action: "check" as const },
    { name: "Error", action: "uncheck" as const },
    { name: "Info", action: "check" as const },
  ],
};

export const geolocationData = {
  labelPrefix: "Geolocation-Test-Label",
  wifiPrefix: "Geolocation-Wifi-Test",
  searchLocation: "Mapua",
};

export const geofencingData = {
  sortColumns: ["Zone Name"],
  filters: {
    lockDevice: {
      cellName: "Lock device filter",
      enabled: "Enabled",
      disabled: "Disabled",
    },
    alertAdmin: {
      cellName: "Alert Admin filter",
      enabled: "Enabled",
      disabled: "Disabled",
    },
  },
  lockDeviceSequence: [
    { name: "Enabled", action: "check" as const },
    { name: "Enabled", action: "uncheck" as const },
    { name: "Disabled", action: "check" as const },
  ],
  alertAdminSequence: [
    { name: "Enabled", action: "check" as const },
    { name: "Enabled", action: "uncheck" as const },
    { name: "Disabled", action: "check" as const },
  ],
};
