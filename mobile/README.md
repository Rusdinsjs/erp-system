# 📱 Mobile App Testing Guide

The **Management System Mobile App** is built with [Expo](https://expo.dev), making it very easy to test on your physical device.

## 🚀 Option 1: Testing on Physical Device (Recommended)
This is the best way to test Camera and Location features.

1.  **Download Expo Go**:
    *   [Android (Play Store)](https://play.google.com/store/apps/details?id=host.exp.exponent)
    *   [iOS (App Store)](https://apps.apple.com/us/app/expo-go/id982107779)

2.  **Run the Project**:
    In your terminal, inside the `mobile` folder, run:
    ```bash
    npx expo start
    ```

3.  **Scan & Play**:
    *   Use the **Expo Go** app to scan the QR code displayed in your terminal.
    *   The app will bundle and stream to your phone.

## 💻 Option 2: Android Emulator / iOS Simulator
If you have Android Studio or Xcode installed.

1.  Start your Emulator/Simulator.
2.  Run `npx expo start`.
3.  Press `a` for Android or `i` for iOS in the terminal.

## 🌐 Option 3: Web Preview
Good for testing UI layout, but **Camera/Scanner features won't work**.

1.  Run `npx expo start --web`.
2.  Or press `w` in the terminal after starting.

---

## 🧪 What to Test (Test Scripts)

### 1. Login Flow
*   **Action**: Enter any email/password (e.g., `admin@test.com`, `pass`).
*   **Expectation**: Success login, navigating to Dashboard.

### 2. Dashboard (`(tabs)/index`)
*   **Action**: Check if "Welcome User" and Stat Cards appear.
*   **Action**: Tap "Scan Asset" or "My Tasks" buttons.
*   **Expectation**: Smooth navigation to respective tabs.

### 3. Scanner (`(tabs)/scan`)
*   **Action**: Grant Camera & Location permissions when prompted.
*   **Action**: Point camera at any QR code.
*   **Expectation**: Haptic vibration, pop-up with "Asset Scanned", and "View Detail" button.

### 4. Asset Detail (`assets/[id]`)
*   **Action**: from Scan pop-up, click "View Detail".
*   **Expectation**: See "Excavator CAT-320" (mock data), Location map marker, and "Update Location" button works.

### 5. My Tasks (`(tabs)/tasks`)
*   **Action**: Switch tabs (Pending / In Progress / Done).
*   **Expectation**: List updates. Clicking a task logs "Open Task" in console.

### 6. Approval Center (`approvals`)
*   **Action**: Go to Dashboard -> (Create a link if missing, or use deep link).
*   *Note*: Ensure you have a button to navigate here, or use router `/approvals`.

---

## ⚠️ Troubleshooting
*   **"Network Response Timed Out"**: Make sure your phone and laptop are on the **same Wi-Fi network**.
*   **Camera not working on Simulator**: Simulators often don't support camera. Use a physical device.
