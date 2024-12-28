"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileUpload } from "@/components/FileUpload";
import { JobUrlInput } from "@/components/JobUrlInput";
import { AnalysisResult } from "@/components/AnalysisResult";
import { LoadingState } from "@/components/LoadingState";
import { useToast } from "@/hooks/use-toast";
import { analyzeResume, generateCoverLetter } from "../actions";

// Update the interface to match the server response
export interface AnalysisResponse {
  success: boolean;
  analysis?: {
    missingRequirements: string[];
    improvements: string[];
  };
  coverLetter?: string;
  jobDescription?: string;
  resume?: string;
}

export default function Home() {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [jobUrl, setJobUrl] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResponse | undefined>(undefined);

  const handleAnalyze = async () => {
    if (!file || !jobUrl) {
      toast({
        title: "Missing information",
        description: "Please upload a resume and provide a job post URL",
        variant: "destructive",
      });
      return;
    }

    setIsAnalyzing(true);
    setResult(undefined);
    const startTime = performance.now();

    try {
      const formData = new FormData();
      formData.append("resume", file);
      formData.append("jobUrl", jobUrl);

      console.time("analysis time");

      // First call to get the analysis
      const analysisResponse = await analyzeResume(formData);
      console.log("analysisResponse", analysisResponse);
      if (!analysisResponse.success) {
        throw new Error(analysisResponse.error || "Analysis failed");
      }

      // Store the analysis result
      setResult(analysisResponse.analysis);

      console.log("analysisResponse", analysisResponse);
      // Second call to get the cover letter
      const coverLetterResponse = await generateCoverLetter(analysisResponse);

      console.log("coverLetterResponse", coverLetterResponse);

      if (coverLetterResponse) {
        setResult(
          (prev) =>
            ({
              ...prev, // Spread the previous state
              coverLetter: coverLetterResponse, // Add the cover letter
            } as AnalysisResponse)
        ); // Cast to AnalysisResponse

        console.log("result", result);
      } else {
        throw new Error("Failed to generate cover letter");
      }
    } catch (error) {
      toast({
        title: "Analysis Failed",
        description:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);

      const endTime = performance.now();
      const durationInSeconds = (endTime - startTime) / 1000;
      console.log(`analysis time: ${durationInSeconds.toFixed(2)} seconds`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container py-8 max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-8">
          Resume Enhancer & Cover Letter Generator
        </h1>

        <div className="grid gap-8 md:grid-cols-2 mb-8">
          <div className="space-y-6">
            <FileUpload onFileSelect={(f) => setFile(f)} />
            <JobUrlInput value={jobUrl} onChange={setJobUrl} />
            <Button
              className="w-full"
              onClick={handleAnalyze}
              disabled={isAnalyzing || !file || !jobUrl}
            >
              {isAnalyzing ? "Analyzing..." : "Analyze"}
            </Button>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm">
            <h2 className="text-xl font-semibold mb-4">How it works</h2>
            <ol className="list-decimal pl-6 space-y-2">
              <li>Upload your resume in PDF format</li>
              <li>Paste the URL of the job posting</li>
              <li>Click analyze to get personalized suggestions</li>
              <li>Use the feedback to improve your application</li>
            </ol>
          </div>
        </div>

        {isAnalyzing ? (
          <LoadingState />
        ) : result?.analysis ? (
          <AnalysisResult
            analysis={result.analysis}
            coverLetter={result.coverLetter || ""}
          />
        ) : null}
      </div>
    </div>
  );
}
