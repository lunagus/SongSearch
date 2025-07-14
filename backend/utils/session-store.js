import fs from 'fs';
const SESSION_FILE = './sessions.json';

let sessions = {};

// Load sessions from file at startup
if (fs.existsSync(SESSION_FILE)) {
  try {
    sessions = JSON.parse(fs.readFileSync(SESSION_FILE, 'utf-8'));
  } catch (e) {
    sessions = {};
  }
}

// Save sessions to file
function saveSessions() {
  fs.writeFileSync(SESSION_FILE, JSON.stringify(sessions, null, 2));
}

export function getSession(key) {
  return sessions[key];
}

export function setSession(key, value) {
  sessions[key] = value;
  saveSessions();
}

export function deleteSession(key) {
  delete sessions[key];
  saveSessions();
}

export function getAllSessions() {
  return sessions;
} 