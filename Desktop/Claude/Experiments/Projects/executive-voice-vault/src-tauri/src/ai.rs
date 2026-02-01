use serde::{Deserialize, Serialize};
use tauri::Emitter;
use reqwest::multipart;

#[derive(Debug, Serialize)]
struct AnthropicRequest {
    model: String,
    max_tokens: u32,
    system: String,
    messages: Vec<Message>,
    #[serde(skip_serializing_if = "Option::is_none")]
    stream: Option<bool>,
}

#[derive(Debug, Serialize)]
struct Message {
    role: String,
    content: String,
}

#[derive(Debug, Deserialize)]
struct AnthropicResponse {
    content: Vec<ContentBlock>,
}

#[derive(Debug, Deserialize)]
struct ContentBlock {
    #[serde(rename = "type")]
    block_type: String,
    text: Option<String>,
}

pub async fn call_claude(
    api_key: &str,
    system_prompt: &str,
    user_message: &str,
    max_tokens: u32,
) -> Result<String, String> {
    let client = reqwest::Client::new();

    let request = AnthropicRequest {
        model: "claude-sonnet-4-20250514".to_string(),
        max_tokens,
        system: system_prompt.to_string(),
        messages: vec![Message {
            role: "user".to_string(),
            content: user_message.to_string(),
        }],
        stream: None,
    };

    let response = client
        .post("https://api.anthropic.com/v1/messages")
        .header("x-api-key", api_key)
        .header("anthropic-version", "2023-06-01")
        .header("content-type", "application/json")
        .json(&request)
        .send()
        .await
        .map_err(|e| format!("Request failed: {}", e))?;

    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().await.unwrap_or_default();
        return Err(format!("Anthropic API error ({}): {}", status, body));
    }

    let body: AnthropicResponse = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse response: {}", e))?;

    body.content
        .iter()
        .find(|b| b.block_type == "text")
        .and_then(|b| b.text.clone())
        .ok_or_else(|| "No text response from Claude".to_string())
}

#[derive(Clone, Serialize)]
struct StreamChunk {
    text: String,
}

pub async fn call_claude_streaming(
    app_handle: &tauri::AppHandle,
    api_key: &str,
    system_prompt: &str,
    user_message: &str,
    max_tokens: u32,
) -> Result<(), String> {
    let client = reqwest::Client::new();

    let request = AnthropicRequest {
        model: "claude-sonnet-4-20250514".to_string(),
        max_tokens,
        system: system_prompt.to_string(),
        messages: vec![Message {
            role: "user".to_string(),
            content: user_message.to_string(),
        }],
        stream: Some(true),
    };

    let response = client
        .post("https://api.anthropic.com/v1/messages")
        .header("x-api-key", api_key)
        .header("anthropic-version", "2023-06-01")
        .header("content-type", "application/json")
        .json(&request)
        .send()
        .await
        .map_err(|e| format!("Request failed: {}", e))?;

    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().await.unwrap_or_default();
        let err_msg = format!("Anthropic API error ({}): {}", status, body);
        let _ = app_handle.emit("claude-stream-error", &err_msg);
        return Err(err_msg);
    }

    use tokio::io::AsyncBufReadExt;
    use tokio_stream::StreamExt;

    let byte_stream = response.bytes_stream();
    let stream_reader = tokio_util::io::StreamReader::new(
        byte_stream.map(|r| r.map_err(|e| std::io::Error::new(std::io::ErrorKind::Other, e)))
    );
    let mut lines = tokio::io::BufReader::new(stream_reader).lines();

    while let Some(line) = lines.next_line().await.map_err(|e| format!("Stream read error: {}", e))? {
        if !line.starts_with("data: ") {
            continue;
        }
        let data = &line[6..];
        if data == "[DONE]" {
            break;
        }

        if let Ok(event) = serde_json::from_str::<serde_json::Value>(data) {
            let event_type = event.get("type").and_then(|t| t.as_str()).unwrap_or("");

            if event_type == "content_block_delta" {
                if let Some(delta) = event.get("delta") {
                    if let Some(text) = delta.get("text").and_then(|t| t.as_str()) {
                        let _ = app_handle.emit("claude-stream-chunk", StreamChunk {
                            text: text.to_string(),
                        });
                    }
                }
            } else if event_type == "message_stop" {
                break;
            } else if event_type == "error" {
                let err_msg = event.get("error")
                    .and_then(|e| e.get("message"))
                    .and_then(|m| m.as_str())
                    .unwrap_or("Unknown streaming error")
                    .to_string();
                let _ = app_handle.emit("claude-stream-error", &err_msg);
                return Err(err_msg);
            }
        }
    }

    let _ = app_handle.emit("claude-stream-done", ());
    Ok(())
}

pub async fn transcribe_audio(api_key: &str, audio_bytes: Vec<u8>) -> Result<String, String> {
    let client = reqwest::Client::new();

    let audio_part = multipart::Part::bytes(audio_bytes)
        .file_name("recording.webm")
        .mime_str("audio/webm")
        .map_err(|e| format!("Failed to create audio part: {}", e))?;

    let form = multipart::Form::new()
        .text("model", "whisper-1")
        .part("file", audio_part);

    let response = client
        .post("https://api.openai.com/v1/audio/transcriptions")
        .header("Authorization", format!("Bearer {}", api_key))
        .multipart(form)
        .send()
        .await
        .map_err(|e| format!("Whisper request failed: {}", e))?;

    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().await.unwrap_or_default();
        return Err(format!("Whisper API error ({}): {}", status, body));
    }

    #[derive(Deserialize)]
    struct WhisperResponse {
        text: String,
    }

    let body: WhisperResponse = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse Whisper response: {}", e))?;

    Ok(body.text)
}
