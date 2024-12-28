"use server";

import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import FirecrawlApp from "@mendable/firecrawl-js";
import { togetherai } from "@ai-sdk/togetherai";
import { AnalysisResponse } from "./page";
import { createClient } from "@supabase/supabase-js";
// import { headers } from "next/headers";

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function logCoverLetterGeneration() {
  const { error } = await supabase
    .from("cover_letters")
    .insert([{ generated_at: new Date() }]); // Adjust the fields as necessary
  if (error) {
    console.error("Error logging cover letter generation:", error);
  }
}

async function extractTextFromPDF(file: File): Promise<string> {
  try {
    // Convert File to Buffer
    const blob = new Blob([await file.arrayBuffer()], {
      type: "application/pdf",
    });

    // Create temporary file path for PDFLoader
    const loader = new PDFLoader(blob);

    // Load and parse the PDF
    const pages = await loader.load();

    // Combine all pages text
    const text = pages.map((page) => page.pageContent).join("\n");

    if (!text) {
      throw new Error("Text extraction resulted in empty text");
    }

    return text.trim();
  } catch (error) {
    console.error("Text extraction error:", error);
    throw new Error(
      error instanceof Error
        ? error.message
        : "Failed to extract text from file"
    );
  }
}

export async function analyzeResumeOpenAI(formData: FormData) {
  try {
    const file = formData.get("resume") as File;
    const jobUrl = formData.get("jobUrl") as string;
    const jobPosting = formData.get("jobPosting") as string;

    // Load and parse PDF using LangChain

    const resumeText = await extractTextFromPDF(file).catch((error) => {
      console.error("Text extraction failed:", error);
      throw new Error("Failed to extract text from file");
    });

    let jobDescription;
    if (jobPosting) {
      jobDescription = jobPosting;
    } else if (jobUrl) {
      // Crawl job posting using Firecrawl
      const crawler = new FirecrawlApp({
        apiKey: process.env.FIRECRAWL_API_KEY,
      });

      const jobData = await crawler.crawlUrl(jobUrl, {
        limit: 1,
        scrapeOptions: {
          formats: ["markdown"],
          onlyMainContent: true,
        },
      });

      // console.log("we have the job data");

      if (!jobData.success || !jobData.data?.[0]?.markdown) {
        console.error("Job scraping failed:", jobData);
        return { success: false, error: "Failed to fetch job posting" };
      }

      jobDescription = jobData.data[0].markdown;
    } else {
      return {
        success: false,
        error: "Neither job posting nor job URL provided",
      };
    }

    // console.log("Job Description:", jobDescription);
    // Generate resume analysis
    const analysis = await generateText({
      model: openai("gpt-4"),
      messages: [
        {
          role: "system",
          content: `You are an expert resume analyzer. You must return your analysis in the following JSON structure:
  {
    "analysis": {
      "missingRequirements": [
        "requirement 1",
        "requirement 2"
      ],
      "improvements": [
        "improvement 1",
        "improvement 2"
      ]
    }
  }
  Each array item should be a complete, self-contained suggestion.
  Do not include numbering in the items - they will be numbered on display.`,
        },
        {
          role: "user",
          content: `Analyze this resume against the job posting. Provide:
  1. Missing requirements: Skills and experiences required by the job that are not evident in the resume
  2. Improvements: Specific, actionable suggestions to enhance the resume
  
  Return the analysis in the specified JSON format.
            
  Resume:
  ${resumeText}
            
  Job Posting:
  ${jobDescription}`,
        },
      ],
    });

    const analysisJson = JSON.parse(analysis.text);

    // Generate cover letter (remains the same)
    const coverLetter = await generateText({
      model: openai("gpt-3.5-turbo-1106"),
      messages: [
        {
          role: "system",
          content:
            "You are an expert cover letter writer. Create professional, concise cover letters that highlight relevant experience and skills.",
        },
        {
          role: "user",
          content: `Write a professional cover letter based on this resume and job posting. The cover letter should:
        - Be no more than one page
        - Include contact information at the top
        - Highlight the most relevant skills and experiences
        - Address any potential gaps identified in the resume analysis
                  
        Resume:
        ${resumeText}
                  
        Job Posting:
        ${jobDescription}`,
        },
      ],
    });

    await logCoverLetterGeneration();

    return {
      success: true,
      analysis: analysisJson.analysis,
      coverLetter: coverLetter.text,
    };
  } catch (error) {
    console.error("Analysis failed:", error);
    return {
      success: false,
      error: "Failed to analyze resume. Please try again.",
    };
  }
}
export async function analyzeResumeTogetherComputer(formData: FormData) {
  try {
    const file = formData.get("resume") as File;
    const jobUrl = formData.get("jobUrl") as string;
    const jobPosting = formData.get("jobPosting") as string;

    // Load and parse PDF using LangChain

    const resumeText = await extractTextFromPDF(file).catch((error) => {
      console.error("Text extraction failed:", error);
      throw new Error("Failed to extract text from file");
    });

    let jobDescription;
    if (jobPosting) {
      jobDescription = jobPosting;
    } else if (jobUrl) {
      // Crawl job posting using Firecrawl
      console.log("we are crawling the job post");
      const crawler = new FirecrawlApp({
        apiKey: process.env.FIRECRAWL_API_KEY,
      });

      const jobData = await crawler.crawlUrl(jobUrl, {
        limit: 1,
        scrapeOptions: {
          formats: ["markdown"],
          onlyMainContent: true,
        },
      });

      console.log("we have the job data");

      if (!jobData.success || !jobData.data?.[0]?.markdown) {
        console.error("Job scraping failed:", jobData);
        return { success: false, error: "Failed to fetch job posting" };
      }

      jobDescription = jobData.data[0].markdown;
    } else {
      return {
        success: false,
        error: "Neither job posting nor job URL provided",
      };
    }

    // console.log("Job Description:", jobDescription);
    // Generate resume analysis
    const analysis = await generateText({
      model: togetherai("mistralai/Mixtral-8x22B-Instruct-v0.1"),
      messages: [
        {
          role: "system",
          content: `You are an expert resume analyzer. You must return your analysis in the following JSON structure:
        {
          "analysis": {
            "missingRequirements": [
              "requirement 1",
              "requirement 2"
            ],
            "improvements": [
              "improvement 1",
              "improvement 2"
            ]
          }
        }
        Each array item should be a complete, self-contained suggestion.
        Do not include numbering in the items - they will be numbered on display.`,
        },
        {
          role: "user",
          content: `Analyze this resume against the job posting. Provide:
        1. Missing requirements: Skills and experiences required by the job that are not evident in the resume
        2. Improvements: Specific, actionable suggestions to enhance the resume
        
        Return the analysis in the specified JSON format.
                  
        Resume:
        ${resumeText}
                  
        Job Posting:
        ${jobDescription}`,
        },
      ],
    });

    // Parse the response as JSON

    console.log("we have the analysis");
    const analysisJson = JSON.parse(analysis.text);

    const startTime = performance.now();

    // Generate cover letter (remains the same)
    const coverLetter = await generateText({
      model: togetherai("mistralai/Mistral-7B-Instruct-v0.3"),
      messages: [
        {
          role: "system",
          content:
            "You are an expert cover letter writer. Create professional, concise cover letters that highlight relevant experience and skills.",
        },
        {
          role: "user",
          content: `Write a professional cover letter based on this resume and job posting. The cover letter should:
        - Be no more than one page
        - Include name and email of applicant at the top
        - Do not include the  link to the job post just the company name on the top of the cover letter
        - Highlight the most relevant skills and experiences
        - Address any potential gaps identified in the resume analysis
                  
        Resume:
        ${resumeText}
                  
        Job Posting:
        ${jobDescription}`,
        },
      ],
    });

    await logCoverLetterGeneration();

    const endTime = performance.now();
    console.timeEnd("analysis time");
    console.log(`Analysis time: ${(endTime - startTime) / 1000} seconds`);

    return {
      success: true,
      analysis: analysisJson.analysis,
      coverLetter: coverLetter.text,
    };
  } catch (error) {
    console.error("Analysis failed:", error);
    return {
      success: false,
      error: "Failed to analyze resume. Please try again.",
    };
  }
}

export async function analyzeResume(formData: FormData) {
  console.log("Starting analysis");
  const file = formData.get("resume") as File;
  const jobUrl = formData.get("jobUrl") as string;
  const jobPosting = formData.get("jobPosting") as string;

  // Load and parse PDF using LangChain
  const resumeText = await extractTextFromPDF(file);

  let jobDescription;
  if (jobPosting) {
    jobDescription = jobPosting;
  } else if (jobUrl) {
    console.log("Crawling job post");
    const crawler = new FirecrawlApp({ apiKey: process.env.FIRECRAWL_API_KEY });
    const jobData = await crawler.crawlUrl(jobUrl, {
      limit: 1,
      scrapeOptions: {
        formats: ["markdown"],
        onlyMainContent: true,
      },
    });

    if (!jobData.success || !jobData.data?.[0]?.markdown) {
      throw new Error("Failed to fetch job posting");
    }

    jobDescription = jobData.data[0].markdown;
  } else {
    throw new Error("Neither job posting nor job URL provided");
  }

  // Generate resume analysis
  const analysis = await generateText({
    model: togetherai("mistralai/Mixtral-8x22B-Instruct-v0.1"),
    messages: [
      {
        role: "system",
        content: `You are an expert resume analyzer. You must return your analysis in the following JSON structure:
      {
        "analysis": {
          "missingRequirements": [
            "requirement 1",
            "requirement 2"
          ],
          "improvements": [
            "improvement 1",
            "improvement 2"
          ]
        }
      }
      Each array item should be a complete, self-contained suggestion.
      Do not include numbering in the items - they will be numbered on display.`,
      },
      {
        role: "user",
        content: `Analyze this resume against the job posting. Provide:
      1. Missing requirements: Skills and experiences required by the job that are not evident in the resume
      2. Improvements: Specific, actionable suggestions to enhance the resume
      
      Return the analysis in the specified JSON format.
                
      Resume:
      ${resumeText}
                
      Job Posting:
      ${jobDescription}`,
      },
    ],
  });

  const response = {
    analysis: JSON.parse(analysis.text),
    resume: resumeText,
    jobDescription,
    success: true,
    error: null,
  };

  return response;
}

export async function generateCoverLetter(analysisResponse: AnalysisResponse) {
  console.log("Generating cover letter");

  // const headersList = await headers();
  // const ip = headersList.get("x-forwarded-for") || headersList.get("x-real-ip");
  // Generate cover letter based on the analysis
  // console.log(ip);

  const coverLetter = await generateText({
    model: togetherai("mistralai/Mixtral-8x22B-Instruct-v0.1"),
    messages: [
      {
        role: "system",
        content:
          "You are an expert cover letter writer. Create professional, concise cover letters that highlight relevant experience and skills.",
      },
      {
        role: "user",
        content: `Write a professional cover letter based on this resume and job posting. The cover letter should:
      - Be no more than one page
      - Include JUST THE name and email of applicant at the top
      - Highlight the most relevant skills and experiences
      - Address any potential gaps identified in the resume analysis
                
      Resume:
      ${analysisResponse.resume}
                
      Job Posting:
      ${analysisResponse.jobDescription}`,
      },
    ],
  });

  await logCoverLetterGeneration();

  return coverLetter.text;
}
