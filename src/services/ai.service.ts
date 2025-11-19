import Groq from 'groq-sdk';
import { AppError, SOAPNotes } from '../types';
import { logDatabase } from '../config/logger';

/**
 * AI Service for clinical note generation using Groq API
 */
export class AIService {
  private groq: Groq;

  constructor() {
    const apiKey = process.env.GROQ_API_KEY;
    
    if (!apiKey) {
      throw new Error('GROQ_API_KEY is not configured in environment variables');
    }

    this.groq = new Groq({
      apiKey: apiKey
    });
  }

  /**
   * Generate structured SOAP notes from consultation transcript
   * @param transcript - Raw consultation transcript text
   * @returns Structured SOAP notes
   */
  public async generateSOAPNotes(transcript: string): Promise<SOAPNotes> {
    try {
      if (!transcript || transcript.trim().length === 0) {
        throw new AppError('Transcript is required to generate clinical notes', 400);
      }

      logDatabase('AI_REQUEST', 'groq', { transcriptLength: transcript.length });

      const completion = await this.groq.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: `You are a medical assistant helping to document patient consultations. 
Convert the consultation transcript into structured SOAP notes (Subjective, Objective, Assessment, Plan).

IMPORTANT INSTRUCTIONS:
- Extract information accurately from the transcript
- Use clear, professional medical language
- Support both English and Kiswahili content
- If information is missing for a section, write "Not documented" instead of leaving it empty
- Be concise but comprehensive
- Include relevant vital signs, symptoms, diagnoses, and treatment plans

Return ONLY a valid JSON object with this exact structure:
{
  "subjective": "Patient's complaints, symptoms, and history",
  "objective": "Physical examination findings, vital signs, test results",
  "assessment": "Diagnosis, clinical impression, differential diagnoses",
  "plan": "Treatment plan, medications, follow-up instructions"
}`
          },
          {
            role: 'user',
            content: `Generate SOAP notes from this consultation transcript:\n\n${transcript}`
          }
        ],
        model: 'llama-3.1-70b-versatile',
        temperature: 0.3,
        max_tokens: 2000,
        response_format: { type: 'json_object' }
      });

      const responseContent = completion.choices[0]?.message?.content;

      if (!responseContent) {
        throw new AppError('Failed to generate clinical notes from AI', 500);
      }

      // Parse the JSON response
      const soapNotes = JSON.parse(responseContent) as SOAPNotes;

      // Validate that all required fields are present
      if (!soapNotes.subjective || !soapNotes.objective || !soapNotes.assessment || !soapNotes.plan) {
        throw new AppError('AI generated incomplete SOAP notes', 500);
      }

      logDatabase('AI_RESPONSE', 'groq', { 
        success: true,
        tokensUsed: completion.usage?.total_tokens || 0
      });

      return soapNotes;

    } catch (error: any) {
      // Handle Groq API specific errors
      if (error.status === 429) {
        throw new AppError('AI service rate limit exceeded. Please try again later.', 429);
      } else if (error.status === 401) {
        throw new AppError('AI service authentication failed. Please check API key.', 500);
      } else if (error instanceof AppError) {
        throw error;
      } else {
        logDatabase('AI_ERROR', 'groq', { error: error.message });
        throw new AppError(`Failed to generate clinical notes: ${error.message}`, 500);
      }
    }
  }

  /**
   * Extract key medical information from transcript
   * @param transcript - Raw consultation transcript
   * @returns Extracted medical entities (symptoms, diagnoses, medications)
   */
  public async extractMedicalEntities(transcript: string): Promise<{
    symptoms: string[];
    diagnoses: string[];
    medications: string[];
  }> {
    try {
      if (!transcript || transcript.trim().length === 0) {
        return { symptoms: [], diagnoses: [], medications: [] };
      }

      const completion = await this.groq.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: `You are a medical information extraction assistant. 
Extract symptoms, diagnoses, and medications mentioned in the consultation transcript.

Return ONLY a valid JSON object with this structure:
{
  "symptoms": ["symptom1", "symptom2"],
  "diagnoses": ["diagnosis1", "diagnosis2"],
  "medications": ["medication1", "medication2"]
}

If none found for a category, return an empty array.`
          },
          {
            role: 'user',
            content: `Extract medical information from this transcript:\n\n${transcript}`
          }
        ],
        model: 'llama-3.1-8b-instant',
        temperature: 0.2,
        max_tokens: 1000,
        response_format: { type: 'json_object' }
      });

      const responseContent = completion.choices[0]?.message?.content;

      if (!responseContent) {
        return { symptoms: [], diagnoses: [], medications: [] };
      }

      const entities = JSON.parse(responseContent);
      return {
        symptoms: entities.symptoms || [],
        diagnoses: entities.diagnoses || [],
        medications: entities.medications || []
      };

    } catch (error: any) {
      logDatabase('AI_ERROR', 'groq_extraction', { error: error.message });
      // Return empty arrays on error rather than failing
      return { symptoms: [], diagnoses: [], medications: [] };
    }
  }

  /**
   * Translate text between English and Kiswahili
   * @param text - Text to translate
   * @param targetLanguage - Target language ('en' or 'sw')
   * @returns Translated text
   */
  public async translateText(text: string, targetLanguage: 'en' | 'sw'): Promise<string> {
    try {
      const languageName = targetLanguage === 'en' ? 'English' : 'Kiswahili';

      const completion = await this.groq.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: `You are a medical translator. Translate the text to ${languageName}. 
Preserve medical terminology accuracy. Return ONLY the translated text, nothing else.`
          },
          {
            role: 'user',
            content: text
          }
        ],
        model: 'llama-3.1-70b-versatile',
        temperature: 0.2,
        max_tokens: 2000
      });

      return completion.choices[0]?.message?.content || text;

    } catch (error: any) {
      logDatabase('AI_ERROR', 'groq_translation', { error: error.message });
      // Return original text on error
      return text;
    }
  }
}

export const aiService = new AIService();
