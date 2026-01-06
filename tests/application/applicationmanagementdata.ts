export const applicationManagementData = {
    navigation: {
        applicationManagement: 'Application Management',
        managedApplications: 'Managed Applications',
        publicApplications: 'Public Applications',
        webApplications: 'Web Applications',
        systemApplications: 'System Applications',
    },

    managedApp: {
        name: 'App Playwright',
        rowName: 'App Playwright app.',
    },

    publicApp: {
        searchTerm: 'slack',
        appName: 'Slack',
        expectedText: 'Slack helps',
    },

    webApp: {
        title: 'Delete This',
        url: 'https://playwright.dev',
        expectedText: 'Not available yet',
    },

    systemApp: {
        sortColumns: {
            name: 'Name',
            packageName: 'Package Name',
            brand: 'Brand',
            model: 'Model',
        },
        sortClicks: 3,
    },

    buttons: {
        add: 'plus Add',
        remove: 'Remove application',
        ok: 'OK',
        create: 'Create',
        delete: 'Delete',
    },

    messages: {
        added: 'was added',
        deleted: 'have been deleted',
        deleteConfirmation: 'Delete App',
    },
} as const;