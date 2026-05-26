# Salesforce Validation Rule Manager

![React](https://img.shields.io/badge/React-Frontend-61DAFB?style=for-the-badge&logo=react)
![Vite](https://img.shields.io/badge/Vite-Build_Tool-646CFF?style=for-the-badge&logo=vite)
![Node.js](https://img.shields.io/badge/Node.js-Backend-339933?style=for-the-badge&logo=node.js)
![Express](https://img.shields.io/badge/Express-API-000000?style=for-the-badge&logo=express)
![Salesforce](https://img.shields.io/badge/Salesforce-OAuth_Integration-00A1E0?style=for-the-badge&logo=salesforce)
![OAuth2](https://img.shields.io/badge/OAuth2-Authentication-orange?style=for-the-badge)
![Vercel](https://img.shields.io/badge/Vercel-Frontend_Deployment-black?style=for-the-badge&logo=vercel)
![Render](https://img.shields.io/badge/Render-Backend_Deployment-46E3B7?style=for-the-badge)

---

## Project Overview

The Salesforce Validation Rule Manager is a production-style full-stack web application designed to securely connect with Salesforce using OAuth 2.0, retrieve Account validation rules through Salesforce Tooling API, and provide a controlled interface for reviewing and preparing rule state updates.

The project simulates a lightweight administrative governance dashboard that demonstrates secure authentication workflows, API integrations, metadata querying, deployment-ready frontend/backend separation, and real-world SaaS integration architecture.

---
## Key Features
# Secure Salesforce OAuth Authentication
- OAuth 2.0 based Salesforce login flow
- Connected App integration
- Secure token-based authentication
- Session-aware frontend workflow
# Validation Rule Inventory
- Fetches Account validation rules dynamically using Salesforce Tooling API
- Displays:
  - Rule Name
  - Object
  - Active / Inactive Status
  - Description
- Real-time metadata visualization
# Rule State Management
- Toggle validation rules between active and inactive states
- Controlled deployment preparation workflow
- UI designed to simulate metadata administration tools
# Production-Oriented Architecture
- Frontend deployed separately on Vercel
- Backend deployed separately on Render
- Secure environment variable handling
- CORS-controlled API communication
- Deployment-ready configuration
  
  ---

  ## Local Setup Instructions
# Clone Repository

```bash
git clone https://github.com/hrittikahajari-pea/Salesforce-validation-rule-manager.git
cd Salesforce-validation-rule-manager
```
# Install Frontend Dependencies
```bash
npm install
```
# Install Backend Dependencies
```bash
cd server
npm install
cd ..
```
# Configure Environment Variables
Create a `.env` file in the root directory:
```env
VITE_SALESFORCE_CLIENT_ID=your_salesforce_connected_app_client_id
VITE_SALESFORCE_REDIRECT_URI=http://localhost:5173/callback
VITE_SALESFORCE_LOGIN_URL=https://login.salesforce.com
VITE_API_BASE_URL=http://localhost:4000
```
# Start Backend Server
```bash
cd server
node index.js
```
Backend runs on:
```bash
http://localhost:4000
```
# Start Frontend
Open another terminal:
```bash
npm run dev
```
Frontend runs on:
```bash
http://localhost:5173
```
# Salesforce Connected App Setup
Inside Salesforce:
# Enable OAuth
Add Callback URL:
```bash
http://localhost:5173/callback
```
# Add OAuth Scopes
- Manage user data via APIs (api)
- Access identity URL service (id, profile, email)
# Production Deployment
Frontend Deployment
- Vercel
Backend Deployment
- Render
# Production OAuth Callback URL
```bash
https://salesforce-validation-rule-manager-coral.vercel.app/callback
```
---
```text
salesforce-validation-rule-manager/
│
├── public/
├── src/
│   ├── App.jsx
│   ├── App.css
│   ├── main.jsx
│
├── server/
│   ├── index.js
│   ├── package.json
│
├── .env
├── package.json
├── vite.config.js
├── vercel.json
└── README.md
```text
