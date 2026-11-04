# Option Tamil Trader (ZENPR16 APP) - Comprehensive Test Cases Report

This document outlines detailed manual testing scenarios for the Option Tamil Trader application, broken down by core features, specific components, and critical functions.

---

## 1. Contexts & Authentication (`AuthContext.tsx`)

### 1.1 `signUp(email, password, name, phone)`
- **TC-AUTH-01:** Verify `signUp` successfully creates an account and creates a corresponding row in the `profiles` table.
- **TC-AUTH-02:** Verify signup fails with a descriptive error if the email is already in use.
- **TC-AUTH-03:** Verify `status` is correctly initialized as `pending` upon signup (unless auto-approve is active).

### 1.2 `login(email, password)`
- **TC-AUTH-04:** Verify `login` successfully authenticates the user and retrieves their `profiles` and `user_roles` data.
- **TC-AUTH-05:** Verify login fails gracefully with invalid credentials.
- **TC-AUTH-06:** Verify session persists across page reloads.

### 1.3 `signOut()`
- **TC-AUTH-07:** Verify `signOut` clears the session, resets Context state, and redirects the user to the Login page.

### 1.4 `ProtectedRoute.tsx` Component
- **TC-AUTH-08:** Verify accessing a protected route without a valid session redirects to `/login`.
- **TC-AUTH-09:** Verify accessing an `/admin` route without an `admin` role redirects to `/` (Home) or an unauthorized page.

---

## 2. Video Playback & Security (`VideoEmbed.tsx` & `LessonPlayer.tsx`)

### 2.1 Video Parsing & Rendering (`VideoEmbed.tsx`)
- **TC-VID-01:** Verify the component correctly parses and renders YouTube URLs.
- **TC-VID-02:** Verify the component correctly parses and renders Vimeo URLs.
- **TC-VID-03:** Verify the component correctly parses and renders Google Drive Preview URLs.
- **TC-VID-04:** Verify an "Invalid video URL" message is displayed for unsupported or malformed links.

### 2.2 Playback Features (`VideoEmbed.tsx`)
- **TC-VID-05:** Verify custom playback controls (Play, Pause, Mute, Fullscreen) work correctly for embedded videos.
- **TC-VID-06:** Verify the `seekForward` and `seekBackward` functions skip exactly 10 seconds of playback.
- **TC-VID-07:** Verify the component saves playback timestamps to `localStorage` every few seconds.
- **TC-VID-08:** Verify the "Resume Playback" banner appears if a user returns to a partially watched video, and that clicking "Resume" jumps to the saved timestamp.

### 2.3 Anti-Piracy & Security (`LessonPlayer.tsx` & `VideoEmbed.tsx`)
- **TC-SEC-01:** Verify the Watermark dynamically overlays the user's Email/Phone and ID, moving across the screen continuously.
- **TC-SEC-02:** Verify pressing "PrintScreen" triggers a Security Alert and locks the video playback for 5 seconds.
- **TC-SEC-03:** Verify pressing screen recording shortcuts (e.g., `Alt+R`) triggers a Security Alert.
- **TC-SEC-04:** Verify inspecting the element or resizing the window drastically triggers the system inspection security alert.
- **TC-SEC-05:** Verify switching browser tabs pauses/hides the video until the window regains focus.

---

## 3. Course Access & Learning Flow (`CourseDetail.tsx` & `LessonPlayer.tsx`)

### 3.1 Course Details & Access Checks
- **TC-CRS-01:** Verify an enrolled user sees the "Start Learning" or "Continue Learning" button.
- **TC-CRS-02:** Verify an approved but *unenrolled* user sees the "Request Access" button.
- **TC-CRS-03:** Verify clicking "Request Access" successfully submits a row to `course_requests` and updates the button to "Access Requested".
- **TC-CRS-04:** Verify users with a `pending` account status see the "Awaiting Account Approval" banner instead of action buttons.

### 3.2 Lesson Progression (`LessonPlayer.tsx`)
- **TC-CRS-05:** Verify direct URL navigation to a lesson by an unenrolled user results in an "Access Denied" screen.
- **TC-CRS-06:** Verify the `markCompleteMutation` successfully marks a lesson as completed in the `lesson_progress` table.
- **TC-CRS-07:** Verify completing a lesson updates the visual checkmark in the Sidebar Lesson List and advances the user to the next lesson automatically (if one exists).

---

## 4. Communication (`CourseChat.tsx`)

### 4.1 Real-Time Messaging
- **TC-CHAT-01:** Verify sending a message (`handleSend`) inserts the message into `course_messages` and displays it instantly.
- **TC-CHAT-02:** Verify Supabase Realtime subscriptions update the chat interface instantly when another user sends a message.

### 4.2 Admin Replies & Formatting
- **TC-CHAT-03:** Verify users see their own messages aligned to the right, and other students' messages aligned to the left.
- **TC-CHAT-04:** Verify messages sent by an Admin display the "Instructor" badge and distinct styling.
- **TC-CHAT-05:** Verify Admins can click the "Reply" icon on a student's message, and the reply correctly references the parent message in the UI (`reply_to_id`).

---

## 5. Admin Panel Functions (`AdminUsers.tsx` & `AdminRequests.tsx`)

### 5.1 User Management (`AdminUsers.tsx`)
- **TC-ADM-01:** Verify admins can approve a pending user (`handleApprove`), which updates their status and auto-enrolls them in default courses.
- **TC-ADM-02:** Verify the "Approve All Pending" button successfully batch-approves all pending users.
- **TC-ADM-03:** Verify admins can reject a user with a specific reason (`handleReject`), and that the user sees this reason upon login.
- **TC-ADM-04:** Verify toggling the "Auto-Approve New Users" setting updates the `settings` table correctly.

### 5.2 Course Access Toggles (`AdminUsers.tsx`)
- **TC-ADM-05:** Verify clicking the "Access" button opens the course management modal for a specific user.
- **TC-ADM-06:** Verify toggling a course ON successfully triggers an `upsert` in the `enrollments` table.
- **TC-ADM-07:** Verify toggling a course OFF successfully triggers a `delete` in the `enrollments` table, instantly revoking the user's access.

### 5.3 Course Requests (`AdminRequests.tsx`)
- **TC-ADM-08:** Verify the table accurately displays all pending course access requests.
- **TC-ADM-09:** Verify approving a request (`handleApprove`) creates an enrollment and updates the request status to `approved`.
- **TC-ADM-10:** Verify rejecting a request updates the status to `rejected` and removes it from the pending list.
