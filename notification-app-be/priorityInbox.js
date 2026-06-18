import fs from 'fs';
import path from 'path';

// Weights for the priority notification categories
const WEIGHTS = {
  'Placement': 3,
  'Result': 2,
  'Event': 1
};

/**
 * Comparator function to define priority.
 * Returns positive if b has higher priority than a, negative if a has higher, 0 if equal.
 */
function compareNotifications(a, b) {
  const weightA = WEIGHTS[a.Type] || 0;
  const weightB = WEIGHTS[b.Type] || 0;

  if (weightB !== weightA) {
    return weightB - weightA; // Higher weight first
  }

  // If weights are equal, sort by recency (Timestamp descending)
  return new Date(b.Timestamp) - new Date(a.Timestamp);
}

/**
 * Class to efficiently maintain the top N priority notifications in memory.
 * Uses a sorted array of max size N. New elements are inserted in O(N) time.
 */
class PriorityInbox {
  constructor(maxSize = 10) {
    this.maxSize = maxSize;
    this.items = []; // Kept sorted: highest priority at index 0, lowest at index length-1
  }

  /**
   * Inserts a new notification. If the inbox is full, the lowest priority item drops out.
   * Runs in O(maxSize) time, which is extremely efficient for small maxSize (e.g. 10).
   */
  insert(notification) {
    // If the list is full and the new item has lower priority than the worst item, ignore it
    if (this.items.length >= this.maxSize) {
      const worstItem = this.items[this.items.length - 1];
      if (compareNotifications(notification, worstItem) >= 0) {
        return false; // Does not make it to top 10
      }
    }

    // Find insertion position (linear scan for small arrays, or binary search)
    let insertIndex = 0;
    while (insertIndex < this.items.length) {
      if (compareNotifications(notification, this.items[insertIndex]) < 0) {
        break;
      }
      insertIndex++;
    }

    // Insert the item
    this.items.splice(insertIndex, 0, notification);

    // Trim list if it exceeds maxSize
    if (this.items.length > this.maxSize) {
      this.items.pop();
    }
    return true;
  }

  getItems() {
    return this.items;
  }
}

/**
 * Attempts to retrieve the access token dynamically:
 * 1. Checks process.env.ACCESS_TOKEN
 * 2. Parses it from logging-middleware/logger.js if present and not a placeholder
 */
function getAuthToken() {
  if (process.env.ACCESS_TOKEN) {
    return process.env.ACCESS_TOKEN;
  }

  try {
    const loggerPath = path.resolve(process.cwd(), 'logging-middleware/logger.js');
    if (fs.existsSync(loggerPath)) {
      const content = fs.readFileSync(loggerPath, 'utf8');
      const match = content.match(/"Authorization":\s*"Bearer\s+([^"]+)"/);
      if (match && match[1] && !match[1].includes('...')) {
        return match[1];
      }
    }
  } catch (err) {
    console.warn("Failed to check logger.js for token:", err.message);
  }

  return null;
}

async function run() {
  const token = getAuthToken();
  if (!token) {
    console.error("Error: Authorization token not found!");
    console.error("Please set the ACCESS_TOKEN environment variable or configure it in logger.js.");
    process.exit(1);
  }

  console.log("Fetching notifications from Test Server...");
  
  try {
    const response = await fetch("http://4.224.186.213/evaluation-service/notifications?limit=100", {
      headers: {
        "Authorization": `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status} - ${await response.text()}`);
    }

    const data = await response.json();
    const notifications = data.notifications || [];
    console.log(`Successfully fetched ${notifications.length} notifications.\n`);

    // Initialize the priority inbox with size 10
    const inbox = new PriorityInbox(10);

    // Insert all fetched notifications
    for (const n of notifications) {
      inbox.insert(n);
    }

    // Print the top 10 priority notifications
    console.log("==================================================");
    console.log("            🔥 PRIORITY INBOX (TOP 10)            ");
    console.log("==================================================");
    
    inbox.getItems().forEach((n, idx) => {
      console.log(`${idx + 1}. [${n.Type}] - ${n.Message}`);
      console.log(`   Timestamp: ${n.Timestamp} | ID: ${n.ID}`);
      console.log("--------------------------------------------------");
    });

  } catch (error) {
    console.error("Failed to run priority inbox:", error.message);
  }
}

run();
