const ALLOWED_VALUES = {
  stack: ["backend", "frontend"],
  level: ["debug", "info", "warn", "error", "fatal"],
  package: ["style", "auth", "config", "middleware", "utils", "api", "component", "hook", "page", "state"]
};

export async function Log(stack, level, pkg, message) {
  if (stack !== stack.toLowerCase() || level !== level.toLowerCase() || pkg !== pkg.toLowerCase()) {
    console.warn("Log rejected: Lowercase required.");
    return;
  }
  if (!ALLOWED_VALUES.stack.includes(stack) || !ALLOWED_VALUES.level.includes(level) || !ALLOWED_VALUES.package.includes(pkg)) {
    console.warn("Log rejected: Schema violation.");
    return;
  }
  try {
    await fetch("http://4.224.186.213/evaluation-service/logs", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." // Put your custom Postman access_token here if you have one
      },
      body: JSON.stringify({ stack, level, package: pkg, message })
    });
  } catch (error) {
    console.error("Logger error:", error);
  }
}