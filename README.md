# WizyEMM Automation Testing #

This project uses [Playwright](https://playwright.dev/) to automate end-to-end tests and other repetitive test cases. It helps ensure application reliability, improve test coverage, and speed up the development workflow through consistent and efficient testing.

The project includes integrated **CI/CD pipelines**, **Slack notifications**, and **cloud-based test report storage** for seamless test automation and reporting.

## Setup Instructions ##

**Pre-requisite**
* Source Code Editor
* Node JS
* Admin emails to be added on .env should have access to the namespace

1. **Clone the repository**
* wizyemm-automation-testing 

2. **Install Dependencies**

## How to run tests ##
1. **Create .env files**
* Modify the `.env{.dev/.production/.staging}`
* attributes in the env file
`NAMESPACE={namespace of customer}`
`REGION={region of namespace}`
`DOMAIN={domain of wizyemm}`
`EMAIL={email to be used as credentials}`
`PASSWORD={password of the email}`

2. **Running the test**
* Run on terminal using the following commands:
* `npm run test:staging {file}` - Run tests against staging environment
* `npm run test:prod {file}` - Run tests against production environment
* `npm run test:dev {file}` - Run tests against development environment
* Add the filename if you want to run specific tests

## Continuous Integration & Deployment (CI/CD) ##

### GitHub Actions Pipeline ###

This project uses **GitHub Actions** for automated testing on every push and pull request. The pipeline includes:

**Trigger Events:**
- Push to `main` or `development` branches
- Pull requests to `main` branch
- Manual trigger via workflow dispatch (supports optional release title from Jira)

**Pipeline Steps:**
1. **Code Checkout** - Retrieves the latest code
2. **Environment Setup** - Installs Node.js 18 and dependencies
3. **Playwright Setup** - Installs Playwright browsers
4. **Test Execution**:
   - Runs login tests first
   - Runs full test suite across all modules (profile, application, configuration, dashboard, fleet, notifications, settings)
5. **Report Generation** - Generates Allure test reports
6. **Artifact Upload** - Uploads test results as GitHub artifacts
7. **Cloud Integration** - Uploads reports to Google Cloud Storage
8. **Slack Notification** - Sends test results to Slack channel

**Workflow File:** `.github/workflows/playwright-tests.yml`

### Manual Pipeline Trigger ###

To run the pipeline manually:

1. Go to **GitHub Repository** → **Actions** tab
2. Select **Playwright Tests** workflow from the left sidebar
3. Click **Run workflow** button
4. (Optional) Enter a release title from Jira in the input field
5. Click **Run workflow** to start the pipeline

The pipeline will execute all steps and send results to Slack upon completion.

## Cloud Integration ##

### Google Cloud Storage (GCS) ##

Test reports are automatically uploaded to Google Cloud Storage for centralized storage and easy access:

**Features:**
- Automatic authentication using GCP service account credentials (stored in GitHub Secrets)
- Version-based organization: `v{VERSION}-Tr.{TEST_RUN_NUMBER}`
- Automatic version detection from API response
- Signed URLs generated for secure, temporary access (valid for 7 days)
- Storage bucket: `gs://emm-test-artifacts/`

**Report Structure:**
- Reports organized by application version
- Multiple test runs tracked per version
- Full Allure reports with test details, screenshots, and logs

## Slack Integration ##

### Automated Test Reporting ##

Test results are automatically sent to Slack after each test run.

**Configuration File:** `config/slack-report-config.json`

The Slack integration provides:
- Test status summary (All Passed, Failed, Flaky)
- Execution time and metadata
- Failed test details (up to 10 tests)
- Direct link to full Allure report via signed URL
- Channel: `#test-reports` (Asia/Manila timezone)

### Contribution guidelines ###

#### Writing tests ####
* Use Playwright and follow the `tests/` folder structure

#### Code review ####
* All pull requests must be reviewed by at least one core team member before merging

#### Other guidelines ####
* Coding style or formatting rules (e.g., use Prettier, proper indentation)
* Branch naming conventions
* Commit message format (e.g., Conventional Commits)
* Any required documentation or comments in the code

## Allure Reporting ##

Test reports are generated using the [Allure Framework](https://docs.qameta.io/allure/):

**Local Usage:**
- `npm run allure:report` - Generate and open Allure report locally (includes history)
- `npm run clean:allure` - Clean previous Allure results

**Cloud Reports:**
- Reports are automatically generated and uploaded to Google Cloud Storage
- Access via signed URLs shared in Slack notifications
- Reports valid for 7 days from generation

### Who do I talk to? ###

* Repo Owner or Admins
* For general questions, contact the QA team on Slack (#wizyemm-qa)