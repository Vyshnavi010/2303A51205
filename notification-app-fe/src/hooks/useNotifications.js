import { useState, useEffect } from "react";
import { fetchNotifications } from "../api/notifications";
import { Log } from "../../../logging-middleware/logger";

export function useNotifications({ page = 1, limit = 10, notificationType = '', token = '' } = {}) {
  const [notifications, setNotifications] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      // If token is missing, don't attempt to load notifications and don't trigger errors yet
      if (!token) {
        setNotifications([]);
        setTotal(0);
        setTotalPages(0);
        setError("Please enter a valid Authorization Token to retrieve notifications.");
        return;
      }

      setLoading(true);
      setError(null);

      try {
        await Log("frontend", "info", "hook", `Hook useNotifications: Fetching notifications (Page: ${page}, Limit: ${limit}, Filter: ${notificationType})`);
        
        const data = await fetchNotifications({ page, limit, notificationType }, token);
        
        if (active) {
          const list = data.notifications || [];
          setNotifications(list);
          
          // Compute pagination parameters
          // Note: Since the backend API response does not explicitly contain total counts,
          // we can assume a sensible heuristic or total notifications length based on limit.
          // If the page returned is full, there's likely a next page.
          const isPageFull = list.length >= limit;
          const estimatedTotalPages = isPageFull ? page + 1 : page;
          
          setTotal(list.length);
          setTotalPages(estimatedTotalPages);
        }
      } catch (err) {
        if (active) {
          setError(err.message || "An unexpected error occurred.");
          await Log("frontend", "error", "hook", `Hook useNotifications Error: ${err.message}`);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      active = false;
    };
  }, [page, limit, notificationType, token]);

  return { notifications, total, totalPages, loading, error };
}
