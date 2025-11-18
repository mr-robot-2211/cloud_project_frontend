"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import Link from "next/link";

interface Recommendation {
  id: number;
  title: string;
  description: string;
  recommendation_score: number;
  reason: string;
  metadata?: any;
}

export default function RecommendationsPage() {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    // Get user ID from localStorage
    if (typeof window !== "undefined") {
      const storedUserId = localStorage.getItem("userId");
      if (!storedUserId) {
        setError("Please log in to see personalized recommendations");
        setLoading(false);
        return;
      }
      setUserId(storedUserId);
    }
  }, []);

  useEffect(() => {
    if (!userId) return;

    const recommendationServiceUrl = 
      process.env.NEXT_PUBLIC_RECOMMENDATION_SERVICE || "http://localhost:8003";
    
    // Ensure URL doesn't have trailing slash to avoid double slashes
    const baseUrl = recommendationServiceUrl.replace(/\/$/, '');
    const url = `${baseUrl}/api/recommendations/${userId}/?limit=10`;

    // Get token for authorization
    const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
    
    axios
      .get(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        timeout: 30000, // 30 second timeout for recommendation generation
      })
      .then((res) => {
        setRecommendations(res.data || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching recommendations:", err);
        const errorMessage = err.response?.data?.error || err.message || "Failed to load recommendations. Please try again later.";
        setError(errorMessage);
        setLoading(false);
      });
  }, [userId]);

  if (loading) {
    return (
      <div>
        <h2>Personalized Recommendations</h2>
        <p>Loading recommendations...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <h2>Personalized Recommendations</h2>
        <div style={{ 
          padding: 15, 
          marginBottom: 20, 
          backgroundColor: "#fee", 
          color: "#c33", 
          borderRadius: 4,
          border: "1px solid #fcc"
        }}>
          {error}
        </div>
        <Link href="/login" style={{ color: "#007bff" }}>
          Go to Login
        </Link>
      </div>
    );
  }

  if (recommendations.length === 0) {
    return (
      <div>
        <h2>Personalized Recommendations</h2>
        <p>No recommendations available at the moment. Try enrolling in some courses first!</p>
        <Link href="/courses" style={{ color: "#007bff" }}>
          Browse Courses
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h2>Personalized Recommendations</h2>
      <p style={{ marginBottom: 20, color: "#666" }}>
        Based on your learning history and preferences
      </p>
      
      <div style={{ display: "grid", gap: 20 }}>
        {recommendations.map((rec) => (
          <div
            key={rec.id}
            style={{
              padding: 20,
              border: "1px solid #ddd",
              borderRadius: 8,
              backgroundColor: "#f9f9f9",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 10 }}>
              <h3 style={{ margin: 0 }}>
                <Link 
                  href={`/courses/${rec.id}`}
                  style={{ color: "#007bff", textDecoration: "none" }}
                >
                  {rec.title}
                </Link>
              </h3>
              <div style={{ 
                padding: "4px 12px", 
                backgroundColor: "#e3f2fd", 
                borderRadius: 12,
                fontSize: 12,
                fontWeight: "bold",
                color: "#1976d2"
              }}>
                {(rec.recommendation_score * 100).toFixed(0)}% match
              </div>
            </div>
            
            <p style={{ marginBottom: 10, color: "#555" }}>
              {rec.description || "No description available"}
            </p>
            
            {rec.reason && (
              <div style={{ 
                padding: 10, 
                backgroundColor: "#e8f5e9", 
                borderRadius: 4,
                fontSize: 14,
                color: "#2e7d32",
                marginTop: 10
              }}>
                <strong>Why recommended:</strong> {rec.reason}
              </div>
            )}
            
            {rec.metadata && (
              <div style={{ marginTop: 10, fontSize: 12, color: "#888" }}>
                {rec.metadata.category && (
                  <span style={{ marginRight: 10 }}>
                    Category: {rec.metadata.category}
                  </span>
                )}
                {rec.metadata.difficulty && (
                  <span>
                    Difficulty: {rec.metadata.difficulty}
                  </span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

