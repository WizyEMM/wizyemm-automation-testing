# WizyEMM Automation Testing #

This project uses [Playwright](https://playwright.dev/) to automate end-to-end tests and other repetitive test cases. It helps ensure application reliability, improve test coverage, and speed up the development workflow through consistent and efficient testing

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
* `npm run test:staging {file}` add the filename if you want to run specific tests
* `npm run test:prod {file}` add the filename if you want to run specific tests
* `npm run test:dev {file}` add the filename if you want to run specific tests


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

### Who do I talk to? ###

* Repo Owner or Admins
* For general questions, contact the QA team on Slack (#wizyemm-qa)