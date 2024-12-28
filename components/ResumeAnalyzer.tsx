"use client";

import { useState } from "react";
import { useCompletion } from "ai/react";

export default function ResumeAnalyzer() {
  const [file, setFile] = useState<File | null>(null);
  const [jobUrl, setJobUrl] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const {
    complete,
    completion,
    error,
    setCompletion, // Add this to reset the completion
  } = useCompletion({
    api: "/api/analyze",
    onFinish: () => {
      setIsAnalyzing(false);
    },
    onError: (error) => {
      setIsAnalyzing(false);
      console.error("Error during analysis:", error);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !jobUrl) return;

    setIsAnalyzing(true);
    setCompletion(""); // Reset previous completion

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("jobUrl", jobUrl);

      await complete("", {
        body: formData,
      });
    } catch (err) {
      console.error("Error:", err);
      setIsAnalyzing(false);
    }
  };

  // Function to render analysis results
  const renderAnalysisResults = () => {
    if (!completion) return null;

    try {
      const analysis = JSON.parse(completion);
      return (
        <div className="mt-6 space-y-4">
          <h2 className="text-xl font-bold">Analysis Results</h2>
          <div className="space-y-4">
            {/* Position and Company */}
            <section>
              <h3 className="font-semibold">Position Details</h3>
              <p>Position: {analysis.position}</p>
              <p>Company: {analysis.companyName}</p>
            </section>

            {/* Improvements Section */}
            <section>
              <h3 className="font-semibold">Suggested Improvements</h3>
              {analysis.improvements?.length > 0 ? (
                <ul className="list-disc pl-5">
                  {analysis.improvements.map(
                    (improvement: string, i: number) => (
                      <li key={i} className="mt-1">
                        {improvement}
                      </li>
                    )
                  )}
                </ul>
              ) : (
                <p>No improvements suggested.</p>
              )}
            </section>

            {/* Skills Gap Section */}
            <section>
              <h3 className="font-semibold">Skills Gap Analysis</h3>
              {analysis.skillsGap?.length > 0 ? (
                <ul className="list-disc pl-5">
                  {analysis.skillsGap.map((skill: string, i: number) => (
                    <li key={i} className="mt-1">
                      {skill}
                    </li>
                  ))}
                </ul>
              ) : (
                <p>No skill gaps identified.</p>
              )}
            </section>

            {/* Cover Letter Section */}
            <section>
              <h3 className="font-semibold">Generated Cover Letter</h3>
              <div className="whitespace-pre-wrap border p-4 rounded bg-white shadow-sm">
                {analysis.coverLetter ||
                  "Cover letter generation in progress..."}
              </div>
            </section>
          </div>
        </div>
      );
    } catch (e) {
      console.error("Error parsing completion:", e);
      return (
        <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded">
          <p>Processing analysis results...</p>
          <pre className="mt-2 text-sm text-gray-600">{completion}</pre>
        </div>
      );
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-4">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Upload Resume (PDF)
          </label>
          <input
            type="file"
            accept=".pdf"
            onChange={(e) => {
              const selectedFile = e.target.files?.[0];
              if (selectedFile && selectedFile.type === "application/pdf") {
                setFile(selectedFile);
              } else {
                alert("Please upload a PDF file");
                e.target.value = "";
              }
            }}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Job Posting URL
          </label>
          <input
            type="url"
            value={jobUrl}
            onChange={(e) => setJobUrl(e.target.value)}
            placeholder="https://example.com/job-posting"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            required
          />
        </div>

        <button
          type="submit"
          disabled={isAnalyzing || !file || !jobUrl}
          className={`w-full py-2 px-4 rounded-md font-medium text-white 
            ${
              isAnalyzing || !file || !jobUrl
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-blue-500 hover:bg-blue-600 transition-colors"
            }`}
        >
          {isAnalyzing ? (
            <div className="flex items-center justify-center">
              <div className="loading-spinner mr-2" />
              <span>Analyzing...</span>
            </div>
          ) : (
            "Analyze Resume"
          )}
        </button>
      </form>

      {/* Error Display */}
      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded text-red-600">
          <p className="font-medium">Error occurred</p>
          <p className="text-sm mt-1">{error.message}</p>
        </div>
      )}

      {/* Analysis Results */}
      {renderAnalysisResults()}
    </div>
  );
}
