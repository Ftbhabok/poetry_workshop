import { createParser, type EventSourceMessage } from "eventsource-parser";

export type ChatGPTAgent = "user" | "system";

export interface ChatGPTMessage {
    role: ChatGPTAgent;
    content: string;
}

export interface OpenAIStreamPayload {
    model: string;
    messages: ChatGPTMessage[];
    temperature: number;
    top_p: number;
    frequency_penalty: number;
    presence_penalty: number;
    max_tokens: number;
    stream: boolean;
    n: number;
}

export async function OpenAIStream(payload: OpenAIStreamPayload) {
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    let counter = 0;

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.OPENAI_API_KEY ?? ""}`,
        },
        method: "POST",
        body: JSON.stringify(payload),
    });

    const stream = new ReadableStream({
        async start(controller) {
            // Callback for handling parsed events
            function onParse(event: EventSourceMessage) {
                const data = event.data; // Accessing data directly

                // Check for end of stream
                if (data === "[DONE]") {
                    controller.close();
                    return;
                }

                try {
                    const json = JSON.parse(data);
                    const text = json.choices[0].delta?.content || "";

                    // Skip prefix characters
                    if (counter < 2 && (text.match(/\n/) || []).length) {
                        return; // Do nothing for prefix characters
                    }

                    // Enqueue the text to the stream
                    const queue = encoder.encode(text);
                    controller.enqueue(queue);
                    counter++;
                } catch (e) {
                    // Handle parse error
                    controller.error(e);
                }
            }

            // Create parser instance with the onParse callback
            const parser = createParser({
                onEvent: onParse,
                onError: (error) => {
                    console.error('Parsing error:', error);
                    controller.error(error);
                },
            });

            // Stream response (SSE) from OpenAI may be fragmented into multiple chunks
            for await (const chunk of res.body as any) {
                parser.feed(decoder.decode(chunk));
            }
        },
    });

    return stream;
}
