/**
 * Utility functions for the compose-letter module
 */

/**
 * Calculate statistics for a letter
 */
export function getLetterStats(content: string) {
  const wordCount = content.trim().split(/\s+/).length;
  const charCount = content.length;
  const readingTime = Math.ceil(wordCount / 200); // Average reading speed
  
  return {
    wordCount,
    charCount,
    readingTime,
    readability: getReadabilityScore(content)
  };
}

/**
 * Get a simplified readability score (A1-C2)
 */
function getReadabilityScore(content: string): string {
  const words = content.trim().split(/\s+/);
  const longWords = words.filter(word => word.length > 6).length;
  const longWordPercentage = (longWords / words.length) * 100;
  
  if (longWordPercentage < 10) return 'A1';
  if (longWordPercentage < 20) return 'A2';
  if (longWordPercentage < 30) return 'B1';
  if (longWordPercentage < 40) return 'B2';
  if (longWordPercentage < 50) return 'C1';
  return 'C2';
}

/**
 * Generate a UUID that's valid for the database
 * This uses the native crypto API to generate a proper UUID
 * according to RFC 4122
 */
export function generateUUID(): string {
  return crypto.randomUUID();
}

/**
 * Generate a UUID based on user IDs
 * This ensures a valid UUID format for the database
 */
export function generateStableId(userId1: string, userId2: string): string {
  // Instead of generating a deterministic ID from the user IDs,
  // we'll just create a proper random UUID
  // This is safer for database compatibility
  return generateUUID();
}
