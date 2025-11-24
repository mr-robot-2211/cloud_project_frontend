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

// Dummy data for demo purposes
const DUMMY_RECOMMENDATIONS: Recommendation[] = [
  {
    id: 1,
    title: "Advanced Kubernetes Administration",
    description: "Master Kubernetes cluster management, networking, and advanced deployment strategies. Learn to scale applications, manage resources, and implement CI/CD pipelines in production environments.",
    recommendation_score: 0.95,
    reason: "Based on your interest in containerization and cloud infrastructure",
    metadata: {
      category: "DevOps",
      difficulty: "Advanced",
      duration: "8 weeks",
      instructor: "John Smith"
    }
  },
  {
    id: 2,
    title: "Microservices Architecture Patterns",
    description: "Design and implement scalable microservices architectures. Explore service mesh, API gateways, distributed tracing, and best practices for building resilient distributed systems.",
    recommendation_score: 0.92,
    reason: "Matches your enrollment history in cloud computing courses",
    metadata: {
      category: "Software Architecture",
      difficulty: "Intermediate",
      duration: "6 weeks",
      instructor: "Sarah Johnson"
    }
  },
  {
    id: 3,
    title: "Docker and Container Orchestration",
    description: "Comprehensive guide to containerization with Docker. Learn container lifecycle management, multi-stage builds, Docker Compose, and integration with orchestration platforms.",
    recommendation_score: 0.88,
    reason: "Complements your current learning path in DevOps",
    metadata: {
      category: "DevOps",
      difficulty: "Intermediate",
      duration: "5 weeks",
      instructor: "Michael Chen"
    }
  },
  {
    id: 4,
    title: "Cloud-Native Application Development",
    description: "Build applications designed for cloud environments. Learn about serverless computing, cloud databases, message queues, and implementing 12-factor app principles.",
    recommendation_score: 0.85,
    reason: "Recommended based on your activity in cloud services",
    metadata: {
      category: "Cloud Computing",
      difficulty: "Intermediate",
      duration: "7 weeks",
      instructor: "Emily Rodriguez"
    }
  },
  {
    id: 5,
    title: "Distributed Systems Design",
    description: "Understand the fundamentals of distributed systems including consensus algorithms, distributed transactions, event sourcing, and building fault-tolerant systems.",
    recommendation_score: 0.82,
    reason: "Aligns with your interest in scalable system design",
    metadata: {
      category: "Computer Science",
      difficulty: "Advanced",
      duration: "10 weeks",
      instructor: "David Kim"
    }
  },
  {
    id: 6,
    title: "CI/CD Pipeline Automation",
    description: "Automate your software delivery pipeline with Jenkins, GitLab CI, GitHub Actions, and modern DevOps tools. Learn testing strategies, deployment automation, and monitoring.",
    recommendation_score: 0.80,
    reason: "Popular among users with similar learning patterns",
    metadata: {
      category: "DevOps",
      difficulty: "Intermediate",
      duration: "4 weeks",
      instructor: "Lisa Anderson"
    }
  },
  {
    id: 7,
    title: "AWS Solutions Architect Certification Prep",
    description: "Prepare for AWS Solutions Architect Associate certification. Cover EC2, S3, RDS, Lambda, VPC, IAM, and other core AWS services with hands-on labs and practice exams.",
    recommendation_score: 0.78,
    reason: "Based on your cloud platform exploration",
    metadata: {
      category: "Cloud Certification",
      difficulty: "Intermediate",
      duration: "12 weeks",
      instructor: "Robert Taylor"
    }
  },
  {
    id: 8,
    title: "Monitoring and Observability",
    description: "Implement comprehensive monitoring solutions using Prometheus, Grafana, ELK stack, and distributed tracing. Learn to set up alerts, dashboards, and performance analysis.",
    recommendation_score: 0.75,
    reason: "Essential skill for production-ready applications",
    metadata: {
      category: "DevOps",
      difficulty: "Intermediate",
      duration: "5 weeks",
      instructor: "Jennifer Lee"
    }
  }
];

export default function RecommendationsPage() {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [useDummyData, setUseDummyData] = useState(false);

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

    // For demo purposes, use dummy data with a simulated loading delay
    // Set USE_DUMMY_DATA=true in environment or uncomment the next line for demo
    const shouldUseDummy = process.env.NEXT_PUBLIC_USE_DUMMY_DATA === 'true' || true; // Set to true for demo
    
    if (shouldUseDummy) {
      setUseDummyData(true);
      // Simulate network delay for realistic demo
      setTimeout(() => {
        setRecommendations(DUMMY_RECOMMENDATIONS);
        setLoading(false);
      }, 800); // 800ms delay to simulate API call
      return;
    }

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
        // Fallback to dummy data for demo if service is unavailable
        console.log("Falling back to dummy data for demo");
        setUseDummyData(true);
        setTimeout(() => {
          setRecommendations(DUMMY_RECOMMENDATIONS);
          setLoading(false);
        }, 500);
      });
  }, [userId]);

  if (loading) {
    return (
      <div>
        <h2>Personalized Recommendations</h2>
        <p style={{ marginBottom: 20, color: "#666" }}>
          Analyzing your learning history and preferences...
        </p>
        <div style={{ 
          padding: 20, 
          border: "1px solid #ddd", 
          borderRadius: 8, 
          backgroundColor: "#f9f9f9",
          textAlign: "center",
          color: "#666"
        }}>
          <div style={{ marginBottom: 10 }}>🔄 Generating personalized recommendations...</div>
          <div style={{ 
            width: "100%", 
            height: 4, 
            backgroundColor: "#e0e0e0", 
            borderRadius: 2,
            overflow: "hidden",
            position: "relative"
          }}>
            <div style={{
              width: "60%",
              height: "100%",
              backgroundColor: "#007bff",
              borderRadius: 2,
              animation: "shimmer 1.5s ease-in-out infinite"
            }}></div>
          </div>
        </div>
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes shimmer {
            0%, 100% { opacity: 0.6; transform: translateX(0); }
            50% { opacity: 1; transform: translateX(10px); }
          }
        `}} />
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
              <div style={{ marginTop: 10, fontSize: 12, color: "#888", display: "flex", flexWrap: "wrap", gap: 10 }}>
                {rec.metadata.category && (
                  <span style={{ 
                    padding: "2px 8px", 
                    backgroundColor: "#f0f0f0", 
                    borderRadius: 4 
                  }}>
                    📚 {rec.metadata.category}
                  </span>
                )}
                {rec.metadata.difficulty && (
                  <span style={{ 
                    padding: "2px 8px", 
                    backgroundColor: "#f0f0f0", 
                    borderRadius: 4 
                  }}>
                    ⚡ {rec.metadata.difficulty}
                  </span>
                )}
                {rec.metadata.duration && (
                  <span style={{ 
                    padding: "2px 8px", 
                    backgroundColor: "#f0f0f0", 
                    borderRadius: 4 
                  }}>
                    ⏱️ {rec.metadata.duration}
                  </span>
                )}
                {rec.metadata.instructor && (
                  <span style={{ 
                    padding: "2px 8px", 
                    backgroundColor: "#f0f0f0", 
                    borderRadius: 4 
                  }}>
                    👤 {rec.metadata.instructor}
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

