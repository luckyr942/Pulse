# How to Demo the Pulse Chat System

This document provides step-by-step instructions to run a live demo of the real-time, horizontally scalable chat system.

---

## Step 1: Restart the WebSocket Server Node
Since we fixed the RabbitMQ queue name spelling typos, you **must restart the active node server** to load the updated constants:
1. Stop the running server in your terminal (usually by pressing `Ctrl + C` in the tab running the server).
2. If it's running in the background, you can kill it with:
   ```bash
   kill $(lsof -t -i:3001)
   ```
3. Restart it by running:
   ```bash
   npm start
   ```

---

## Step 2: Confirm Workers are Running
Ensure both background consumer workers are active and listening to RabbitMQ:
* **DB Persistence Worker**:
  ```bash
  npm run worker:db
  ```
  *(Log should say: `DB Consumer worker listening on queue: chat.persistence`)*
  
* **Offline Notification Worker**:
  ```bash
  npm run worker:notif
  ```
  *(Log should say: `Notification Consumer Worker listening on queue: chat.notifications`)*

---

## Step 3: Run the Expo Mobile App
Launch the React Native front-end:
```bash
cd pulse-app
npm run start
```
*Press `i` to launch in the iOS Simulator or scan the QR code to run on a physical device.*

---

## Step 4: Live Demo Flow

### 1. Account Selection & Mock Mapping
1. Register or log in to a test account (e.g., `testuser123` with password `password123`).
2. On the **Messages** tab, you will see mock conversation profiles (Elena, Engineering Ops, Julian, etc.).
3. Under the hood, we have seeded corresponding real accounts in MongoDB:
   - **Elena Vance** maps to real user `alice` (`6a500abb2109979c5eaaa39a`).
   - **Engineering Ops** maps to real user `bob` (`6a500abb2109979c5eaaa39b`).
   - **Sarah Jenkins** maps to real user `charlie` (`6a500abb2109979c5eaaa39c`).

### 2. Initiating Chat Sessions
1. Tap on **Elena Vance** (Alice).
2. The app checks if a conversation exists in the database. If not, it requests `POST /api/conversations` with Alice's ID, establishing a **real database session**.
3. It opens the chat screen. The send button is fully functional now because `recipientId` is resolved dynamically.

### 3. Asynchronous Write-Behind Caching (RabbitMQ -> MongoDB)
1. Type a message (e.g. `"Hi Alice!"`) and press **Send**.
2. **Optimistic UI**: The message appears in the chat room instantly.
3. **Queue Persist**: The server acknowledges the message in milliseconds and publishes it to RabbitMQ (`chat.persistence`).
4. Look at the **DB Worker** terminal. You will see:
   `[INFO]: Message persistant : saved key = <idempotencyKey>`
5. The message is now safely saved in the remote MongoDB cluster.

### 4. Offline Notifications Processing
1. Since Alice (`Elena Vance`) is currently offline (no socket connection), the server detects she is offline and publishes an alert to RabbitMQ (`chat.notifications`).
2. Look at the **Notification Worker** terminal. You will see:
   `[Notification Sent] To recipient: 6a500abb2109979c5eaaa39a | From sender: testuser123 | Message excerpt: "Hi Alice!"`
