````md
# 🚓 NETRA

> Smart Monitoring & Emergency Response System for Anantapur Police

[🌐 Live Demo](https://netra-smart-personnel--sivadurga1985g.replit.app) 

---

## 📌 Overview

NETRA is a real-time monitoring and emergency response platform built to improve police coordination, officer visibility, and incident response through a secure hierarchical communication system.

---

## ✨ Features

### 🔐 Role-Based Hierarchy

```text
Admin
 └── DSP
      └── CI
           └── SI
                └── Constable
````

* Structured chain of command
* Role-based permissions
* Secure communication flow

### 📍 Live Officer Tracking

* Real-time location monitoring
* Centralized operational visibility
* Faster deployment decisions

### 🚨 Emergency Alert System

* Instant alert generation
* Hierarchical escalation
* Controlled alert forwarding

### 🛑 Bandobasthu Mode

Special operational mode for:

* Public events
* VIP security
* High-risk deployments
* Emergency situations

### ⚡ Real-Time Updates

Powered by WebSockets for:

* Instant communication
* Live event synchronization
* Low-latency updates

---

## 🏗️ Tech Stack

| Layer      | Technology        |
| ---------- | ----------------- |
| Backend    | Node.js + Express |
| Language   | TypeScript        |
| Real-Time  | Socket.io         |
| Database   | SQLite            |
| Deployment | Render            |

---

## 🏛️ Architecture

```text
Officer Devices
       │
       ▼
  Socket.io Layer
       │
       ▼
 Node.js + Express
       │
       ▼
 Hierarchy Engine
       │
       ▼
     SQLite
```

---

## 📂 Project Structure

```bash
.
├── lib/
├── scripts/
├── dist/
├── package.json
├── tsconfig.json
├── pnpm-lock.yaml
└── README.md
```

---

## 🚀 Getting Started

### Install Dependencies

```bash
npm install
```

### Run Development Server

```bash
npm start
```

### Production Build

```bash
npm run build
node dist/server.js
```

---

## 🌐 Deployment

Hosted on Render.

```bash
Build Command: npm install
Start Command: node server.js
```

---

## 🎯 Impact

* 🚓 Faster emergency response
* 👮 Better officer visibility
* 🔒 Secure hierarchy-based communication
* 📡 Improved district-wide coordination

---

## 🚀 Future Scope

* 📱 Mobile application for officers
* ☁️ Cloud-native infrastructure
* 🤖 AI-powered predictive policing
* 📊 Analytics and reporting dashboard

---

## 🏆 Why NETRA?

* Solves a real-world policing challenge
* Scalable architecture
* Real-time communication
* Secure access control
* Practical implementation with immediate impact

---

### Observe • Coordinate • Respond

**NETRA — Smart Monitoring & Emergency Response System**

```
```
