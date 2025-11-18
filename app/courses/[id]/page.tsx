"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { apiClient, sendAnalyticsEvent } from "@/lib/api";

interface CourseMaterial {
  id: number;
  title: string;
  material_type: string;
  download_url: string;
  file_size?: number;
  content_type?: string;
  metadata?: any;
}

export default function CourseDetailPage() {
  const params = useParams();
  const { id } = params;
  const [course, setCourse] = useState<any>(null);
  const [materials, setMaterials] = useState<CourseMaterial[]>([]);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  useEffect(() => {
    if (!id) return;
    
    // Check if user is logged in
    const token = localStorage.getItem("accessToken");
    if (!token) {
      setLoading(false);
      return;
    }

    // Load course
    apiClient
      .get(`${process.env.NEXT_PUBLIC_COURSE_SERVICE}/api/courses/${id}/`)
      .then((res) => {
        setCourse(res.data);
        // Check enrollment
        return apiClient.get(`${process.env.NEXT_PUBLIC_ENROLL_SERVICE}/my-enrollments`);
      })
      .then((res) => {
        const enrollments = res.data || [];
        const courseIdNum = typeof id === 'string' ? parseInt(id) : id;
        const enrolled = enrollments.some((e: any) => e.course_id === courseIdNum);
        setIsEnrolled(enrolled);
        
        // Load materials if enrolled
        if (enrolled) {
          return apiClient.get(
            `${process.env.NEXT_PUBLIC_CONTENT_SERVICE || 'http://localhost:8003'}/api/courses/${id}/materials`
          );
        }
        return Promise.resolve({ data: [] });
      })
      .then((res) => {
        if (res.data) {
          setMaterials(res.data);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error loading course data:", err);
        setLoading(false);
      });
  }, [id]);

  const enroll = async () => {
    try {
      await apiClient.post(
        `${process.env.NEXT_PUBLIC_ENROLL_SERVICE}/enroll`,
        { course_id: id }
      );
      alert("Enrolled successfully");
      setIsEnrolled(true);
      sendAnalyticsEvent({ event: "enroll", course_id: id, ts: Date.now() });
      
      // Reload materials after enrollment
      try {
        const res = await apiClient.get(
          `${process.env.NEXT_PUBLIC_CONTENT_SERVICE || 'http://localhost:8003'}/api/courses/${id}/materials`
        );
        setMaterials(res.data || []);
      } catch (err) {
        console.error("Error loading materials:", err);
      }
    } catch {
      alert("Enroll failed");
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const uploadFile = async () => {
    if (!selectedFile || !id) {
      alert("Please select a file");
      return;
    }

    setUploading(true);
    try {
      const contentServiceUrl = process.env.NEXT_PUBLIC_CONTENT_SERVICE || 'http://localhost:8003';
      
      // Step 1: Get presigned URL from content service
      const fileExtension = selectedFile.name.split('.').pop()?.toLowerCase() || '';
      const materialType = fileExtension === 'pdf' ? 'pdf' : 
                          ['mp4', 'avi', 'mov', 'webm'].includes(fileExtension) ? 'video' : 'other';
      
      const uploadResponse = await apiClient.post(
        `${contentServiceUrl}/api/upload`,
        {
          course_id: parseInt(id as string),
          title: selectedFile.name,
          material_type: materialType,
          file_name: selectedFile.name,
          content_type: selectedFile.type || 'application/octet-stream'
        }
      );

      const { presigned_url } = uploadResponse.data;

      // Step 2: Upload file directly to S3 using presigned URL
      await fetch(presigned_url, {
        method: 'PUT',
        body: selectedFile,
        headers: {
          'Content-Type': selectedFile.type || 'application/octet-stream'
        }
      });

      alert("File uploaded successfully!");
      setSelectedFile(null);
      
      // Reset file input
      const fileInput = document.getElementById('file-upload') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
      
      // Step 3: Reload materials list
      const res = await apiClient.get(
        `${contentServiceUrl}/api/courses/${id}/materials`
      );
      setMaterials(res.data || []);
    } catch (err: any) {
      console.error("Upload error:", err);
      alert(`Upload failed: ${err.response?.data?.detail || err.message || 'Unknown error'}`);
    } finally {
      setUploading(false);
    }
  };

  const loadMaterials = async () => {
    if (!id || !isEnrolled) return;
    try {
      const contentServiceUrl = process.env.NEXT_PUBLIC_CONTENT_SERVICE || 'http://localhost:8003';
      const res = await apiClient.get(
        `${contentServiceUrl}/api/courses/${id}/materials`
      );
      setMaterials(res.data || []);
    } catch (err) {
      console.error("Error loading materials:", err);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (!course) return <div>Failed to load course</div>;

  const isLoggedIn = typeof window !== "undefined" && localStorage.getItem("accessToken");

  return (
    <div style={{ padding: "20px", maxWidth: "800px", margin: "0 auto" }}>
      <h2>{course.title}</h2>
      <p>{course.description}</p>
      
      {!isLoggedIn && (
        <p style={{ color: "#666", fontStyle: "italic" }}>
          Please log in to enroll and access course materials.
        </p>
      )}
      
      {isLoggedIn && !isEnrolled && (
        <div>
          <button 
            onClick={enroll}
            style={{
              padding: "10px 20px",
              backgroundColor: "#0070f3",
              color: "white",
              border: "none",
              borderRadius: "5px",
              cursor: "pointer"
            }}
          >
            Enroll in Course
          </button>
        </div>
      )}

      {isLoggedIn && isEnrolled && (
        <div style={{ marginTop: "30px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
            <h3 style={{ margin: 0 }}>Course Materials</h3>
            <button
              onClick={loadMaterials}
              style={{
                padding: "6px 12px",
                backgroundColor: "#666",
                color: "white",
                border: "none",
                borderRadius: "5px",
                cursor: "pointer",
                fontSize: "14px"
              }}
            >
              Refresh
            </button>
          </div>
          
          {/* Upload Section */}
          <div style={{ 
            border: "2px dashed #ddd", 
            borderRadius: "5px", 
            padding: "20px", 
            marginBottom: "20px",
            backgroundColor: "#f9f9f9"
          }}>
            <h4 style={{ margin: "0 0 10px 0" }}>Upload New Material</h4>
            <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
              <input
                type="file"
                id="file-upload"
                onChange={handleFileSelect}
                disabled={uploading}
                style={{
                  padding: "8px",
                  border: "1px solid #ddd",
                  borderRadius: "5px",
                  fontSize: "14px"
                }}
              />
              {selectedFile && (
                <span style={{ fontSize: "14px", color: "#666" }}>
                  Selected: {selectedFile.name} ({formatFileSize(selectedFile.size)})
                </span>
              )}
              <button
                onClick={uploadFile}
                disabled={!selectedFile || uploading}
                style={{
                  padding: "8px 16px",
                  backgroundColor: selectedFile && !uploading ? "#28a745" : "#ccc",
                  color: "white",
                  border: "none",
                  borderRadius: "5px",
                  cursor: selectedFile && !uploading ? "pointer" : "not-allowed",
                  fontSize: "14px"
                }}
              >
                {uploading ? "Uploading..." : "Upload"}
              </button>
            </div>
          </div>

          {materials.length === 0 ? (
            <p style={{ color: "#666" }}>No materials available for this course yet.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
              {materials.map((material) => (
                <div
                  key={material.id}
                  style={{
                    border: "1px solid #ddd",
                    borderRadius: "5px",
                    padding: "15px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center"
                  }}
                >
                  <div>
                    <h4 style={{ margin: "0 0 5px 0" }}>{material.title}</h4>
                    <p style={{ margin: "0", color: "#666", fontSize: "14px" }}>
                      {material.material_type.toUpperCase()}
                      {material.file_size && ` • ${formatFileSize(material.file_size)}`}
                    </p>
                  </div>
                  {material.download_url && (
                    <a
                      href={material.download_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        padding: "8px 16px",
                        backgroundColor: "#0070f3",
                        color: "white",
                        textDecoration: "none",
                        borderRadius: "5px",
                        fontSize: "14px"
                      }}
                    >
                      {material.material_type === "video" ? "Watch" : "Download"}
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
