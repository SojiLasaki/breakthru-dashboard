# Welcome to Breakthru, a Cummins x Xtern project

## Project info

## How can I edit this code?

There are several ways of editing your application.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## Local login testing

The login page includes quick-fill demo users. Seed matching backend credentials first:

```bash
cd ../Cummins-Backend
uv run --no-sync python manage.py seed_demo_users
```

Then log in with `username = password` using one of:

- `admin`
- `office`
- `engine`
- `electrical`
- `customer`
- `login_probe`

## Agent Studio demo connectors

After backend and local MCP demo servers are running:

1. Open `Agent Studio`
2. Go to `Integration Connectors`
3. Click `Seed Demo Connectors`
4. Go to `Automation Queue` to approve/reject proposed actions from Fix it Felix
