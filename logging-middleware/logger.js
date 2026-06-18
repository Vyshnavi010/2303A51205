const ALLOWED_VALUES = {
  stack: ["backend", "frontend"],
  level: ["debug", "info", "warn", "error", "fatal"],
  package: ["style", "auth", "config", "middleware", "utils", "api", "component", "hook", "page", "state"]
};

function getAuthToken() {
  // Check if we are in the browser
  if (typeof window !== 'undefined' && window.localStorage) {
    const token = localStorage.getItem('access_token');
    if (token) return token;
  }
  
  // Check if we are in Node.js
  if (typeof process !== 'undefined' && process.env) {
    const token = process.env.ACCESS_TOKEN;
    if (token) return token;
  }

  // Fallback placeholder (replace with actual token if testing in CLI)
  return "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...";
}

export async function Log(stack, level, pkg, message) {
  const normStack = String(stack).toLowerCase();
  const normLevel = String(level).toLowerCase();
  const normPkg = String(pkg).toLowerCase();

  if (!ALLOWED_VALUES.stack.includes(normStack) || 
      !ALLOWED_VALUES.level.includes(normLevel) || 
      !ALLOWED_VALUES.package.includes(normPkg)) {
    console.warn(`Log rejected: Schema violation. Received: stack=${normStack}, level=${normLevel}, package=${normPkg}`);
    return;
  }

  const token = getAuthToken();

  try {
    const response = await fetch("http://4.224.186.213/evaluation-service/logs", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({ 
        stack: normStack, 
        level: normLevel, 
        package: normPkg, 
        message 
      })
    });

    if (!response.ok) {
      console.warn(`Logger server rejected log: HTTP ${response.status}`);
    }
  } catch (error) {
    console.error("Logger transport error:", error.message);
  }
}