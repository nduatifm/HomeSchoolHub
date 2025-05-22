import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || "sk-dummy-key" });

type SessionSummaryResult = {
  summary: string;
  keyConcepts: string[];
  homeworkAssigned: string;
  engagementLevel: number;
};

/**
 * Generates an AI session summary from session notes and optionally a recording
 * @param notes The session notes to summarize
 * @param recordingBase64 Optional base64-encoded audio recording
 * @returns A structured session summary
 */
export async function generateSessionSummary(
  notes: string,
  recordingBase64?: string
): Promise<SessionSummaryResult> {
  try {
    // If we have a recording, first transcribe it
    let transcription = "";
    if (recordingBase64) {
      // In a real implementation, we would save the file, process it, then analyze the transcription
      // For this example, we'll simulate a transcription
      transcription = "This is a simulated transcription of the recording.";
    }

    // Combine notes and transcription
    const sessionContent = transcription 
      ? `Session Notes: ${notes}\n\nRecording Transcription: ${transcription}`
      : `Session Notes: ${notes}`;

    const prompt = `
      As an educational assistant, please analyze these tutoring session notes and generate a comprehensive summary.
      
      ${sessionContent}
      
      Please provide a JSON response with the following structure:
      {
        "summary": "A concise paragraph summarizing the session content and student performance",
        "keyConcepts": ["Concept 1", "Concept 2", "Concept 3"],
        "homeworkAssigned": "Description of any assigned homework or tasks",
        "engagementLevel": 4 // A number between 1 (low) and 5 (high) indicating student engagement
      }
    `;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content:
            "You are an educational assistant that helps tutors summarize their sessions. Provide detailed, accurate analysis of tutoring sessions focused on student performance and learning outcomes."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" }
    });

    // Parse the JSON response
    const result = JSON.parse(response.choices[0].message.content);

    return {
      summary: result.summary || "No summary available",
      keyConcepts: result.keyConcepts || [],
      homeworkAssigned: result.homeworkAssigned || "No homework assigned",
      engagementLevel: Math.max(1, Math.min(5, result.engagementLevel || 3)),
    };
  } catch (error) {
    console.error("Error generating session summary:", error);
    // Return a fallback summary if the AI fails
    return {
      summary: "Failed to generate an AI summary. Please try again or create a manual summary.",
      keyConcepts: [],
      homeworkAssigned: "",
      engagementLevel: 3
    };
  }
}
