use std::path::Path;
use crate::vault::*;

/// Input for a derivation request
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct DerivationInput {
    pub derivation_type: String, // "principles", "lexicon", "stances", "narratives", "kernel"
    pub voice_path: String,
    pub speaker: String,
}

/// Gather all quotes for an executive and format them for a derivation prompt
pub fn gather_quotes_for_derivation(voice_path: &Path) -> Result<String, String> {
    let quotes = list_voice_files(voice_path, Some(&VoiceFileType::VoiceQuote))?;

    let mut output = String::new();
    for (i, q) in quotes.iter().enumerate() {
        let id = q.frontmatter.get_string("id");
        let source = q.frontmatter.get_string("source");
        let date = q.frontmatter.get_string("date_spoken");
        let question = q.frontmatter.get_string("organizing_question");

        output.push_str(&format!("--- Quote {} ({}) ---\n", i + 1, id));
        output.push_str(&format!("Source: {} ({})\n", source, date));
        if !question.is_empty() {
            output.push_str(&format!("Question: {}\n", question));
        }
        output.push_str(&format!("{}\n\n", q.body));
    }

    Ok(output)
}

/// Gather existing derived materials for kernel synthesis
pub fn gather_all_derived(voice_path: &Path) -> Result<String, String> {
    let mut output = String::new();

    for file_type in &[
        VoiceFileType::VoicePrinciple,
        VoiceFileType::VoiceLexicon,
        VoiceFileType::VoiceStance,
        VoiceFileType::VoiceNarrative,
    ] {
        let files = list_voice_files(voice_path, Some(file_type))?;
        if files.is_empty() {
            continue;
        }

        output.push_str(&format!("\n=== {} ===\n\n", file_type.as_str().to_uppercase()));
        for f in &files {
            let id = f.frontmatter.get_string("id");
            output.push_str(&format!("--- {} ---\n{}\n\n", id, f.body));
        }
    }

    Ok(output)
}

/// Get the system prompt for a derivation type
pub fn get_derivation_prompt(derivation_type: &str, speaker: &str) -> String {
    match derivation_type {
        "principles" => format!(
            r#"You are a voice analysis expert. Analyze the following verbatim quotes from {speaker} and derive Voice Principles — recurring patterns in how they communicate.

For each principle, provide:
1. A short title (e.g., "Institutional 'We' Framing")
2. The principle description (what the pattern is)
3. Category: tone | structure | cadence | rhetoric
4. Evidence count (how many quotes support it)
5. Do/Don't examples

Format each principle as a markdown section. Identify 5-10 principles, prioritizing patterns with the strongest evidence (3+ quotes).

Only derive principles supported by actual quotes. No speculation."#
        ),
        "lexicon" => format!(
            r#"You are a voice analysis expert. Analyze the following verbatim quotes from {speaker} and extract their Voice Lexicon — signature phrases, recurring metaphors, and distinctive vocabulary.

For each lexicon entry, provide:
1. The phrase or pattern
2. Lexicon type: signature-phrase | recurring-metaphor | colloquialism | jargon
3. Frequency: occasional | frequent | rare
4. Variants observed
5. Context of use (when they deploy this phrase)

Format each entry as a markdown section. Extract 10-20 entries. Only include phrases actually found in the quotes."#
        ),
        "stances" => format!(
            r#"You are a voice analysis expert. Analyze the following verbatim quotes from {speaker} and identify their core Stances — beliefs, positions, and convictions they hold and express.

For each stance, provide:
1. A short title (e.g., "Proprietary tech is non-negotiable")
2. The stance description
3. Stance type: belief | contrarian-take | held-view | position
4. Strength: strong-conviction | held-view | exploratory | evolving
5. How they say it (framing patterns)
6. Evidence quotes (cite specific quote IDs)

Format each stance as a markdown section. Identify 5-10 stances."#
        ),
        "narratives" => format!(
            r#"You are a voice analysis expert. Analyze the following verbatim quotes from {speaker} and identify their recurring Narratives — stories, analogies, and examples they reuse.

For each narrative, provide:
1. A short title (e.g., "Founding story — software first")
2. The story/analogy description
3. Narrative type: origin-story | analogy | case-story | personal-riff | recurring-example
4. Core point
5. Variations observed
6. Evidence quotes (cite specific quote IDs)

Format each narrative as a markdown section. Identify 3-7 narratives."#
        ),
        "kernel" => format!(
            r#"You are a voice analysis expert. Synthesize all the following derived voice materials for {speaker} into an updated Voice Kernel — a master reference document.

The kernel should include:
1. Voice North Star (1-2 sentence essence of how they communicate)
2. Tone Sliders (5 dimensions: formal/casual, assertive/measured, technical/accessible, institutional/personal, serious/humorous)
3. Cadence Patterns (sentence length, paragraph rhythm, use of fragments, lists)
4. Signature Moves (top rhetorical devices)
5. Qualifiers and Honesty Markers
6. Taboo Patterns (what NOT to do)
7. Do/Don't Summary Table

Format as a complete markdown document."#
        ),
        _ => format!("Analyze the following voice data for {speaker}:"),
    }
}
