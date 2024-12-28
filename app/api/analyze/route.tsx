import { NextRequest, NextResponse } from "next/server";
import FirecrawlApp from "@mendable/firecrawl-js";
import OpenAI from "openai";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
// oute
export const config = {
  api: {
    bodyParser: false,
    sizeLimit: "10mb",
  },
};

// Environment variables
const FIRECRAWL_API_KEY = process.env.FIRECRAWL_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
});

// Helper function to extract text using Tesseract.js
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

    console.log(text);
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
export async function POST(request: NextRequest) {
  console.log("Starting POST request processing");

  try {
    // Validate API keys first
    if (!FIRECRAWL_API_KEY || !OPENAI_API_KEY) {
      console.error("Missing required API keys");
      return NextResponse.json(
        { error: "Required API keys not configured" },
        { status: 500 }
      );
    }

    // Parse the form data
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const jobUrl = formData.get("jobUrl") as string | null;

    // Validate inputs
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!jobUrl) {
      return NextResponse.json(
        { error: "No job URL provided" },
        { status: 400 }
      );
    }

    // Initialize Firecrawl
    const firecrawlApp = new FirecrawlApp({ apiKey: FIRECRAWL_API_KEY });

    // Process file and scrape job posting in parallel
    const [resumeText, jobData] = await Promise.all([
      extractTextFromPDF(file).catch((error) => {
        console.error("Text extraction failed:", error);
        throw new Error("Failed to extract text from file");
      }),

      // Scrape the job posting
      firecrawlApp.crawlUrl(jobUrl, {
        limit: 1,
        scrapeOptions: {
          formats: ["markdown"],
          onlyMainContent: true,
        },
      }),
    ]);

    // Validate job data
    if (!jobData.success || !jobData.data?.[0]?.markdown) {
      console.error("Job scraping failed:", jobData);
      return NextResponse.json(
        { error: "Failed to fetch job posting" },
        { status: 500 }
      );
    }

    const jobDescription = jobData.data[0].markdown;

    console.log();

    // Create the analysis prompt
    const analysisPrompt = `
    You are an expert AI career counselor and resume writer. Analyze the following resume and job description.
    
    Resume:
    ${resumeText}
    
    Job Description:
    ${jobDescription}
    
    Provide a comprehensive analysis in the following JSON format:
    {
      "position": "extracted job title",
      "companyName": "extracted company name",
      "improvements": [
        // Detailed, specific improvements for the resume based on job requirements
      ],
      "skillsGap": [
        // List of specific skills mentioned in job posting but missing from resume
      ],
      "coverLetter": "professional cover letter that highlights relevant experience from resume and addresses job requirements"
    }
    `;

    // refactor from here
    // Create streaming response with OpenAI
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content:
            "You are an expert career counselor and resume writer. Provide analysis in valid JSON format only.",
        },
        {
          role: "user",
          content: analysisPrompt,
        },
      ],
      temperature: 0.7,
      stream: true,
    });

    // Create a ReadableStream from the OpenAI stream
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of completion) {
            const content = chunk.choices[0]?.delta?.content || "";
            if (content) {
              controller.enqueue(new TextEncoder().encode(content));
            }
          }
          controller.close();
        } catch (error) {
          console.error("Streaming error:", error);
          controller.error(error);
        }
      },
    });

    // Return the streaming response
    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    console.error("Error processing request:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details:
          error instanceof Error ? error.message : "An unknown error occurred",
      },
      { status: 500 }
    );
  }
}
