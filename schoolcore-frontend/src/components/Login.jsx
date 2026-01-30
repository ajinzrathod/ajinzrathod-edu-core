import { useState } from "react";
import api from "../utils/api";
import { handleApiError } from "../utils/errorHandler";
import { useAppConfig } from "../context/AppConfigContext.jsx";
import Alert from "./Alert.jsx";

export default function Login({ onLogin }) {
  const { config } = useAppConfig();
  const [credentials, setCredentials] = useState({ username: "", password: "" });
  const [error, setError] = useState("");
  const [errorDuration, setErrorDuration] = useState(5000); // Duration for auto-close
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setCredentials(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await api.post("login/", credentials);
      const { access, user } = response.data;
      onLogin(access, user);
    } catch (err) {
      // Check if this is a device verification error
      const isDeviceError = err.response?.status === 403 &&
                           err.response?.data?.error === "Device not verified";

      // For 401 auth errors, use generic message. For other errors, use actual error from backend
      let errorMessage;
      if (err.response?.status === 401) {
        errorMessage = "Invalid username or password";
      } else {
        errorMessage = handleApiError(err);
      }

      setError(errorMessage);
      // Device verification errors should persist (no auto-close)
      setErrorDuration(isDeviceError ? 0 : 5000);
    } finally {
      setLoading(false);
    }
  };

  const isFormValid = credentials.username.trim() && credentials.password.trim();

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-600 to-blue-800">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-2xl p-8">
          {/* Header */}
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">{config.app_name}</h1>
            <p className="text-gray-600">{config.app_description}</p>
          </div>

          {/* Error Alert */}
          {error && (
            <Alert
              message={error}
              type="error"
              duration={errorDuration}
              onClose={() => setError("")}
            />
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username Field */}
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
                Username
              </label>
              <input
                id="username"
                type="text"
                name="username"
                placeholder="Enter your username"
                value={credentials.username}
                onChange={handleChange}
                disabled={loading}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed transition"
              />
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                name="password"
                placeholder="Enter your password"
                value={credentials.password}
                onChange={handleChange}
                disabled={loading}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed transition"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || !isFormValid}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-2 px-4 rounded-lg transition duration-200 disabled:cursor-not-allowed"
            >
              {loading ? "Logging in..." : "Login"}
            </button>
          </form>

        </div>
      </div>
    </div>
  );
}
