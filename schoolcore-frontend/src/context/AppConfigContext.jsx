import { createContext, useContext, useEffect, useState } from "react";

const AppConfigContext = createContext();

export function AppConfigProvider({ children }) {
  const [config, setConfig] = useState({
    app_name: "Web Smart",
    app_version: "1.0.0",
    app_description: "Records and Compliance Tool",
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        // Try to fetch from API using the configured base URL
        const apiBase = import.meta.env.VITE_API_BASE_URL;
        const response = await fetch(`${apiBase}/api/config/`);
        if (response.ok) {
          const data = await response.json();
          setConfig(data);
          // Cache in localStorage
          localStorage.setItem("appConfig", JSON.stringify(data));
        } else {
          // Try to load from cache
          const cached = localStorage.getItem("appConfig");
          if (cached) {
            setConfig(JSON.parse(cached));
          }
        }
      } catch (err) {
        console.warn("Failed to fetch app config, using defaults:", err);
        // Try to load from cache
        const cached = localStorage.getItem("appConfig");
        if (cached) {
          try {
            setConfig(JSON.parse(cached));
          } catch (parseErr) {
            console.warn("Failed to parse cached config:", parseErr);
          }
        }
      } finally {
        setLoading(false);
      }
    };

    fetchConfig();
  }, []);

  return (
    <AppConfigContext.Provider value={{ config, loading }}>
      {children}
    </AppConfigContext.Provider>
  );
}

export function useAppConfig() {
  const context = useContext(AppConfigContext);
  if (!context) {
    throw new Error("useAppConfig must be used within AppConfigProvider");
  }
  return context;
}
