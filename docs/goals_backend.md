# Lighting Automation Blueprint v2.0

## 1. Stack Overview & Architecture

This project implements a multi-layered, event-driven architecture to provide full programmatic control over the Lenovo Legion keyboard lighting system. It is designed for stability, flexibility, and long-term extensibility.

*   **Core Controller (Node.js + Express):** `server.js`
    *   Hosts a comprehensive REST API for all lighting operations.
    *   Acts as the central "brain," containing all high-level logic (scheduling, notifications, process monitoring).
    *   Manages a SQLite database via **Knex.js** for persistent configuration.
    *   Spawns and supervises disposable `worker.js` processes for each native call, ensuring the main server never crashes or hangs.

*   **Worker Process (Node.js + edge-js):** `worker.js`
    *   A short-lived, single-task script that receives a command and payload from the supervisor.
    *   Uses **`edge-js`** to invoke methods on a C# class library (`EdgeWrapper.dll`). This acts as a bridge between the Node.js and .NET runtimes.
    *   Prints its result to `stdout`, calls a `ShutdownBridge` method to ensure native threads are released, and then exits cleanly.

*   **Managed Bridge (C# Class Library):** `EdgeWrapper.dll`
    *   A .NET Framework 4.8 class library designed to be called by `edge-js`.
    *   Contains simple, static methods (e.g., `GetActiveProfileId()`, `SetProfileJson(string json)`).
    *   Uses P/Invoke (`[DllImport]`) to call the final, native C++ bridge.

*   **Native Bridge (C++):** `ProfileBridge.dll`
    *   A minimal, stable C++ DLL that exposes simple, safe, C-style functions.
    *   Internally, it handles all the complex, unsafe interactions with `Gaming.AdvancedLighting.dll`, including loading, initialization, calling worker functions via the "triplet" method, and handling proprietary C++ object structures.

---

## 2. Database Schema & Design

The database serves as the persistent memory for our automation system. It stores configuration, state, and the critical mapping data we have reverse-engineered.

### **Table: `global_settings`**
This table provides master on/off switches for the system's major automation features, allowing them to be toggled without losing their underlying configuration.

| Field | Type | Description |
| :--- | :--- | :--- |
| `key` | PK, TEXT | The unique name of the setting (e.g., `"time_scheduler_enabled"`, `"process_monitor_enabled"`). |
| `value` | TEXT | The current state of the setting, typically `"true"` or `"false"`. |

### **Table: `processes`**
This table drives the **Process Monitor** logic. It tells the system *what* to watch for and *what* to do when it finds it.

| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | PK | Unique identifier. |
| `process_name` | TEXT | The exact name of the executable to watch for (e.g., `Destiny2.exe`, `Code.exe`). Must be unique. |
| `profile_filename` | TEXT | The name of the JSON profile file (in `json_effects/`) to apply when this process starts (e.g., `aurora_sync.json`). |
| `is_active` | BOOL | A master switch. If `false`, the monitor ignores this process even if it's running. |
| `priority` | INT | (Optional) Determines which profile wins if multiple monitored processes are running simultaneously. Higher wins. |

### **Table: `notifications`**
This table powers the **Event-Driven System**. It maps external triggers (API calls) to specific visual alerts and defines their priority.

| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | PK | Unique identifier. |
| `notification_type` | TEXT | The "slug" or keyword used in the API call (e.g., `new_email`, `cpu_high`, `build_failed`). |
| `profile_filename` | TEXT | The visual effect file to play (e.g., `flash_red.json`, `pulse_blue.json`). |
| `duration_ms` | INT | How long (in milliseconds) the effect should play before reverting. |
| `priority` | INT | **(New)** A number representing priority (e.g., 100=Critical, 50=Normal, 10=Low). Higher values override lower values. |
| `is_active` | BOOL | Master switch to enable/disable this specific notification type. |

### **Table: `animation_definitions`**
This is our **Reference Library**. It stores the "cheat sheet" of animation IDs we discovered so the UI and API can use human-readable names instead of magic numbers.

| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | PK | Unique identifier. |
| `animation_id` | INT | The hardware ID used in the JSON payload (e.g., `11`, `2`, `1005`). |
| `name` | TEXT | The official UI name (e.g., `Static`, `Rainbow Wave`, `Aurora Sync`). |
| `description` | TEXT | A brief description of the effect's behavior. |
| `has_color_list` | BOOL | `true` if the effect supports user-defined colors (`colorType: 2`), `false` if colors are firmware-generated (`colorType: 0/1`). |

### **Table: `key_mappings`**
This is our **Rosetta Stone**. It maps the proprietary hardware index to the physical key on the keyboard. This allows us to build features like "Light up the 'W' key" without needing to look up index `67` every time.

| Field | Type | Description |
| :--- | :--- | :--- |
| `index` | PK | The proprietary hardware index (e.g., `1`, `67`, `154`). |
| `key_name` | TEXT | The standard name of the key (e.g., `ESC`, `W`, `Num 4`). |
| `zone` | TEXT | (Optional) A logical grouping for the key (e.g., `Function Row`, `Numpad`, `Alpha`). Useful for quick selection in a UI. |
| `usb_hid_code` | INT | (Optional) The standard USB HID code for the key, useful for cross-referencing or integration with other tools. |

---

## 3. Endpoint Matrix (Express API in `server.js`)

This section defines the complete REST API for the lighting controller. All interactions with the keyboard hardware and the configuration database are exposed through these endpoints.

#### **System Data Endpoints**

*   **`GET /static-data`**
    *   **Action:** Provides all necessary reference data for building profiles and understanding the system's capabilities. It queries the `animation_definitions` and `key_mappings` tables.
    *   **Response:** `200 OK` with a JSON object containing two arrays: `animations` and `key_map`.
        ```json
        {
          "animations": [
            { "id": 11, "name": "Static", "has_color_list": true },
            { "id": 2, "name": "Rainbow Wave", "has_color_list": false }
          ],
          "key_map": [
            { "index": 1, "name": "ESC", "zone": "Function Row" },
            { "index": 67, "name": "W", "zone": "Alpha" }
          ]
        }
        ```

*   **`GET /settings`**
    *   **Action:** Retrieves all key-value pairs from the `global_settings` table.
    *   **Response:** `200 OK` with a JSON object like `{"time_scheduler_enabled": "true", "process_monitor_enabled": "true"}`.

*   **`PUT /settings`**
    *   **Action:** Updates one or more key-value pairs in the `global_settings` table.
    *   **Request Body:** `{"time_scheduler_enabled": "false"}`
    *   **Response:** `200 OK` with the updated settings object.

#### **Core Control Endpoints**

*   **`GET /active-profile`**
    *   **Action:** Returns the full JSON of the currently active lighting profile.
    *   **Worker Call:** `GetProfileJson()`
    *   **Response:** `200 OK` with the full profile JSON object.

*   **`GET /active-profile/id`**
    *   **Action:** Returns just the numeric index of the currently active profile.
    *   **Worker Call:** `GetProfileIndex()`
    *   **Response:** `200 OK` with `{ "profileId": <id> }`.

*   **`POST /set-active-profile/:id`**
    *   **Action:** Sets the active hardware profile to the specified index.
    *   **Worker Call:** `SetProfileIndex(id)`
    *   **Response:** `200 OK` with `{ "status": "success", "profileId": id }`.

#### **Profile Management Endpoints**

*   **`POST /apply-profile/file/:filename`**
    *   **Action:** Reads a specified `.json` file from the `json_effects/` directory, sends its content to the hardware, and activates that profile.
    *   **Worker Calls:**
        1.  `SetProfileDetails(jsonContent)`
        2.  `SetProfileIndex(profileId_from_json)`
    *   **Response:** `200 OK` with `{ "status": "success", "profile": filename }`.

*   **`POST /apply-profile/raw`**
    *   **Action:** Accepts a raw lighting profile JSON object in the request body and applies it to the hardware.
    *   **Request Body:** A full profile JSON object.
    *   **Worker Calls:**
        1.  `SetProfileDetails(requestBody)`
        2.  `SetProfileIndex(profileId_from_body)`
    *   **Response:** `200 OK` with `{ "status": "success" }`.

#### **Event-Driven Endpoints**

*   **`POST /notify`**
    *   **Action:** Triggers a temporary, high-priority lighting effect for notifications.
    *   **Request Body:** `{"type": "new_message"}`
    *   **Response:** `202 Accepted` (The request is accepted, and the action runs asynchronously according to the logic in Section 4.3).

#### **Process Monitoring CRUD Endpoints**

*   **`GET /processes`**
    *   **Action:** Lists all monitored processes from the `processes` table.
    *   **Response:** `200 OK` with an array of process objects.

*   **`POST /processes`**
    *   **Action:** Adds a new process to monitor.
    *   **Request Body:** `{"process_name": "Destiny2.exe", "profile_filename": "aurora_sync.json"}`
    *   **Response:** `201 Created` with the new process object.

*   **`PUT /processes/:id`**
    *   **Action:** Updates a monitored process entry.
    *   **Request Body:** `{ "profile_filename": "new_profile.json", "is_active": false }`
    *   **Response:** `200 OK` with the updated process object.

*   **`DELETE /processes/:id`**
    *   **Action:** Removes a process from the monitoring list.
    *   **Response:** `204 No Content`.

#### **Time-of-Day Scheduler CRUD Endpoints**

*   **`GET /time-gradients`**
    *   **Action:** Lists all time gradient periods from the `time_gradients` table.
    *   **Response:** `200 OK` with an array of gradient period objects.

*   **`POST /time-gradients`**
    *   **Action:** Adds a new time gradient period to the scheduler.
    *   **Request Body:** `{"start_time": "20:00", "end_time": "23:59", "start_rgb": "#00008B", "end_rgb": "#8B0000"}`
    *   **Response:** `201 Created` with the new gradient object.

*   **`PUT /time-gradients/:id`**
    *   **Action:** Updates an existing time gradient period.
    *   **Request Body:** `{ "start_rgb": "#111111", "is_active": false }`
    *   **Response:** `200 OK` with the updated gradient object.

*   **`DELETE /time-gradients/:id`**
    *   **Action:** Removes a time gradient period from the scheduler.
    *   **Response:** `204 No Content`.

## 4. Behavior Layers (High-Level Logic in `server.js`)

### **4.1 Time-of-Day Scheduler**

This is the core ambient lighting engine. It runs as a persistent background task in `server.js`, dynamically adjusting the keyboard color to reflect the time of day based on a configurable "sun-cycle" gradient.

#### **Database Table: `time_gradients`**
To make the color cycle fully configurable without restarting the server, the scheduler will be driven by this table.

| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | PK | Unique identifier for the gradient period. |
| `start_time` | TEXT | The start time for this gradient in 24-hour `HH:MM` format (e.g., `"06:00"`). |
| `end_time` | TEXT | The end time for this gradient in 24-hour `HH:MM` format (e.g., `"09:00"`). |
| `start_rgb` | TEXT | The hexadecimal RGB color for the `start_time` (e.g., `"#4B0082"` for dark purple). |
| `end_rgb` | TEXT | The hexadecimal RGB color for the `end_time` (e.g., `"#FF8C00"` for dark orange). |
| `is_active` | BOOL | A master switch to enable/disable this specific time period. |

**Example Data:**
| id | start_time | end_time | start_rgb | end_rgb |
|:--:|:---|:---|:---|:---|
| 1 | 00:00 | 06:00 | `#8B0000` | `#4B0082` |
| 2 | 06:00 | 09:00 | `#4B0082` | `#FF8C00` |
| 3 | 09:00 | 12:00 | `#FF8C00` | `#FFFF00` |
| 4 | 12:00 | 16:00 | `#FFFF00` | `#32CD32` |
| 5 | 16:00 | 20:00 | `#32CD32` | `#00008B` |
| 6 | 20:00 | 23:59 | `#00008B` | `#8B0000` |

#### **Scheduler Logic (`setInterval` in `server.js`)**

The scheduler will be a `setInterval` loop that runs frequently (e.g., every 5 minutes).

1.  **Check for Overrides:** On each tick, the first step is to check if a high-priority override (like a process or notification) is active. If it is, the scheduler does nothing and waits for the next tick.

2.  **Get Current Time:** Get the current system time.

3.  **Find Active Gradient:** Query the `time_gradients` table to find the row where the current time is between `start_time` and `end_time`.

4.  **Calculate Gradient Position:**
    *   Determine the total duration of the current gradient period in minutes (e.g., 06:00 to 09:00 is 180 minutes).
    *   Determine the current progress into that period in minutes (e.g., at 07:30, the progress is 90 minutes).
    *   Calculate the percentage of completion: `(current_progress / total_duration)`. In this example, `90 / 180 = 0.5` (or 50%).

5.  **Calculate the Interpolated Color:**
    *   Using a JavaScript gradient library (like `tinygradient` or a simple custom function), interpolate between `start_rgb` and `end_rgb` using the percentage calculated in the previous step.
    *   The library will return the precise intermediate RGB value. For our example at 50%, the color would be a mix between dark purple and dark orange.

6.  **Construct the JSON Payload:**
    *   Dynamically create a full profile JSON object in memory.
    *   Use `animationId: 11` (Static Color).
    *   Populate the `colorList` with the single, calculated RGB color.
    *   Leave the `keys` array empty to apply the color to the entire keyboard.
    *   Assign it to a dedicated "ambient" profile slot (e.g., `profileId: 6`).

7.  **Dispatch the Commands:**
    *   Make an internal API call to the `/apply-profile-raw` endpoint, sending the newly constructed JSON payload.
    *   The endpoint will then trigger the worker process to execute `SetProfileDetails` followed by `SetProfileIndex`, updating the keyboard to the new ambient color.

---

### **4.2 Process Override Monitor**

This is the highest-priority layer of the automation system. Its purpose is to ensure that specific, immersive lighting profiles are active when high-focus applications (like games) are running, overriding all other effects.

#### **Implementation Details**

*   **Task Runner:** A `setInterval` loop in `server.js` will run at a moderate frequency (e.g., every **30 seconds**) to minimize system overhead.
*   **Process Querying Library:** To get a list of running system processes from Node.js, we will use a well-supported, cross-platform library like **`ps-list`**.
    *   `npm install ps-list`
    *   `ps-list` is lightweight and returns a simple array of process objects (e.g., `{pid: 123, name: 'Destiny2.exe', ...}`), which is perfect for our needs.
*   **State Management:** The server will maintain a global state variable, for example `let activeOverride = { type: 'none', profileId: null };`.

#### **Logic Flow (on each 30-second tick)**

1.  **Get Monitored Processes:** Query the `processes` table in the database to get the list of all process names we care about (where `is_active = true`).
2.  **Get Running Processes:** Call `await psList()` to get the current list of all processes running on the system.
3.  **Find a Match:** Compare the two lists. Check if any of the running process names match a name in our monitored list.
4.  **State Transition Logic:**
    *   **If a match is found AND `activeOverride.type` is NOT 'process':**
        1.  A high-priority application has just launched.
        2.  Set the global override state: `activeOverride = { type: 'process', profileId: currentProfileId };` (after saving the current ID).
        3.  Look up the `profile_filename` associated with the detected process in the database.
        4.  Make an internal API call to `/apply-profile-from-file/:filename` to immediately activate the game-specific profile (e.g., `aurora_sync.json`).
        5.  Log the activation: "Process override activated for `Destiny2.exe`."
    *   **If NO match is found AND `activeOverride.type` IS 'process':**
        1.  The high-priority application has just closed.
        2.  Make an internal API call to `/set-active-profile/:id` to restore the profile that was active before the override (`activeOverride.profileId`).
        3.  Clear the override state: `activeOverride = { type: 'none', profileId: null };`.
        4.  Log the deactivation: "Process override released."
    *   **In all other cases (no change in state):** Do nothing.

This logic ensures that the process override is a "sticky" state that takes precedence and correctly restores the previous state upon exit.

### **4.3 Notification Overrides**

This is the second-highest priority layer. It allows for brief, attention-grabbing visual alerts that temporarily interrupt the default ambient lighting but **will not interrupt a process-based override.**

#### **Endpoint: `POST /notify`**

This endpoint is the entry point for all notifications.

#### **Logic Flow (when `/notify` is called)**

1.  **Check for Priority:** The very first step is to check the global state: `if (activeOverride.type === 'process')`.
    *   If `true`, the function immediately returns a `409 Conflict` status with a message like `{"error": "Process override is active; notification ignored."}`. **Your goal of not interrupting games is achieved.**
2.  **Save Current State:** If no process override is active, the function proceeds.
    *   Call the `GetProfileIndex()` worker to get the `currentProfileId` that needs to be restored later.
3.  **Activate Notification:**
    *   Look up the `notification_type` from the request body in the `notifications` database table.
    *   Retrieve the `profile_filename` and `duration_ms` for that notification.
    *   Make an internal API call to `/apply-profile-from-file/:filename` to activate the alert effect (e.g., `flash_red.json`).
4.  **Asynchronous Revert:** The function does **not** wait. It immediately returns a `202 Accepted` response to the caller. It then starts an asynchronous `setTimeout` timer.
    *   `setTimeout(() => { ... }, duration_ms);`
5.  **Restore State:** When the timer fires, the callback function will execute:
    *   It makes one final internal API call to `/set-active-profile/:id`, passing the `currentProfileId` that was saved in step 2. This restores the keyboard to its previous state (likely the time-of-day color).

