"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { sendAnalyticsEvent } from "@/lib/api";

// Helper function to get user service URL
// Backend URL structure: /api/users/signup/ and /api/users/login/
const getUserServiceUrl = () => {
  // Always use the correct URL structure
  // Backend: path("api/users/", include("users.urls")) + path("signup/", ...)
  const defaultUrl = 'http://localhost:8000/api/users';
  const envUrl = process.env.NEXT_PUBLIC_USER_SERVICE;
  
  // Validate and use correct URL
  if (envUrl) {
    // If env var doesn't end with /api/users, fix it
    if (!envUrl.endsWith('/api/users') && !envUrl.endsWith('/api/users/')) {
      console.warn('NEXT_PUBLIC_USER_SERVICE may be incorrect:', envUrl);
      console.warn('Using default URL:', defaultUrl);
      return defaultUrl;
    }
    return envUrl.replace(/\/$/, ''); // Remove trailing slash
  }
  
  return defaultUrl;
};

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [role, setRole] = useState("student");
  const [isSignup, setIsSignup] = useState(false); // Toggle between login and signup
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateForm = () => {
    if (!email.trim()) {
      setError("Email is required");
      return false;
    }
    if (!validateEmail(email)) {
      setError("Please enter a valid email address");
      return false;
    }
    if (!pass.trim()) {
      setError("Password is required");
      return false;
    }
    if (pass.length < 8) {
      setError("Password must be at least 8 characters long");
      return false;
    }
    return true;
  };

  const signup = async () => {
    setError("");
    setSuccess("");
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      const userServiceUrl = getUserServiceUrl();
      const fullUrl = `${userServiceUrl}/signup/`;
      console.log('Signup URL:', fullUrl); // Debug log
      const res = await axios.post(
        fullUrl,
        { email, password: pass, role },
        { headers: { "Content-Type": "application/json" } }
      );
      setSuccess("Account created successfully! You can now login.");
      sendAnalyticsEvent({ event: "signup", user: email, ts: Date.now() });
      // Clear form after successful signup
      setEmail("");
      setPass("");
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || err.response?.data?.message || err.message || "Signup failed. Please try again.";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const login = async () => {
    setError("");
    setSuccess("");
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      const userServiceUrl = getUserServiceUrl();
      const fullUrl = `${userServiceUrl}/login/`;
      console.log('Login URL:', fullUrl); // Debug log
      const res = await axios.post(
        fullUrl,
        { email, password: pass },
        { headers: { "Content-Type": "application/json" } }
      );
      // Store JWT tokens
      if (res.data.access) {
        localStorage.setItem("accessToken", res.data.access);
      }
      if (res.data.refresh) {
        localStorage.setItem("refreshToken", res.data.refresh);
      }
      // Store user data (optional, since role is in token)
      if (res.data.user) {
        localStorage.setItem("userRole", res.data.user.role);
        localStorage.setItem("userId", res.data.user.id.toString());
      }
      setSuccess("Login successful! Redirecting...");
      sendAnalyticsEvent({ event: "login", user: email, ts: Date.now() });
      // Redirect to home page after successful login
      setTimeout(() => {
        router.push("/");
      }, 1000);
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || err.response?.data?.message || err.message || "Login failed. Please check your credentials.";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 400, margin: "50px auto", padding: 20 }}>
      <h2>{isSignup ? "Create Account" : "Login"}</h2>
      
      {error && (
        <div style={{ 
          padding: 10, 
          marginBottom: 10, 
          backgroundColor: "#fee", 
          color: "#c33", 
          borderRadius: 4,
          border: "1px solid #fcc"
        }}>
          {error}
        </div>
      )}
      
      {success && (
        <div style={{ 
          padding: 10, 
          marginBottom: 10, 
          backgroundColor: "#efe", 
          color: "#3c3", 
          borderRadius: 4,
          border: "1px solid #cfc"
        }}>
          {success}
        </div>
      )}

      <div style={{ marginBottom: 15 }}>
        <input
          placeholder="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={loading}
          style={{ 
            width: "100%", 
            padding: 8, 
            fontSize: 16,
            border: "1px solid #ddd",
            borderRadius: 4
          }}
        />
      </div>
      
      <div style={{ marginBottom: 15 }}>
        <input
          placeholder="Password"
          type="password"
          value={pass}
          onChange={(e) => setPass(e.target.value)}
          disabled={loading}
          style={{ 
            width: "100%", 
            padding: 8, 
            fontSize: 16,
            border: "1px solid #ddd",
            borderRadius: 4
          }}
        />
      </div>
      
      {/* Role selection - only shown during signup */}
      {isSignup && (
        <div style={{ marginBottom: 15 }}>
          <label style={{ display: "block", marginBottom: 5, fontSize: 14, fontWeight: "bold" }}>
            I am a:
          </label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            disabled={loading}
            style={{ 
              width: "100%", 
              padding: 8, 
              fontSize: 16,
              border: "1px solid #ddd",
              borderRadius: 4
            }}
          >
            <option value="student">Student</option>
            <option value="instructor">Instructor</option>
          </select>
        </div>
      )}
      
      <div style={{ marginTop: 10 }}>
        <button 
          onClick={isSignup ? signup : login} 
          disabled={loading}
          style={{ 
            padding: "10px 20px", 
            marginRight: 10,
            fontSize: 16,
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.6 : 1,
            backgroundColor: "#007bff",
            color: "white",
            border: "none",
            borderRadius: 4
          }}
        >
          {loading ? "Processing..." : (isSignup ? "Sign Up" : "Log In")}
        </button>
        <button 
          type="button"
          onClick={() => {
            setIsSignup(!isSignup);
            setError("");
            setSuccess("");
          }}
          disabled={loading}
          style={{ 
            padding: "10px 20px",
            fontSize: 16,
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.6 : 1,
            backgroundColor: "transparent",
            color: "#007bff",
            border: "1px solid #007bff",
            borderRadius: 4
          }}
        >
          {isSignup ? "Already have an account? Log In" : "Don't have an account? Sign Up"}
        </button>
      </div>
    </div>
  );
}
