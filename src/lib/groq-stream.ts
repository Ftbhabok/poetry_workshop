import {
    createParser,
    ParsedEvent,
    ReconnectInterval,
  } from 'eventsource-parser'
  
  export type GroqRole = 'user' | 'assistant' | 'system'
  
  export interface GroqMessage {
    role: GroqRole
    content: string
  }
  
  export interface GroqStreamPayload {
    model: string
    messages: GroqMessage[]
    temperature: number
    top_p: number
    max_tokens: number
    stream: boolean
  }
  
  export async function GroqStream(payload: GroqStreamPayload) {
    const encoder = new TextEncoder()
    const decoder = new TextDecoder()
  
    let counter = 0
  
    // Validate API key
    if (!process.env.GROQ_API_KEY) {
      throw new Error('GROQ_API_KEY is not configured')
    }
  
    try {
      const res = await fetch('https://api.groq.com/v1/chat/completions', {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        },
        method: 'POST',
        body: JSON.stringify(payload),
      })
  
      if (!res.ok) {
        const errorData = await res.text()
        console.error('GROQ API Error:', {
          status: res.status,
          statusText: res.statusText,
          body: errorData,
        })
        throw new Error(`GROQ API error: ${res.status} ${errorData}`)
      }
  
      if (!res.body) {
        throw new Error('No response body from GROQ')
      }
  
      const stream = new ReadableStream({
        async start(controller) {
          function onParse(event: ParsedEvent | ReconnectInterval) {
            if (event.type === 'event') {
              const data = event.data
              console.log('Received chunk:', data)
  
              if (data === '[DONE]') {
                controller.close()
                return
              }
  
              try {
                const json = JSON.parse(data)
                const text = json.choices[0].delta?.content || ''
  
                // Skip empty messages and initial newlines
                if (counter < 2 && (text.match(/\n/) || []).length) {
                  return
                }
  
                const queue = encoder.encode(text)
                controller.enqueue(queue)
                counter++
              } catch (e) {
                console.error('Error parsing GROQ response:', e)
                controller.error(e)
              }
            }
          }
  
          try {
            const parser = createParser(onParse)
            
            for await (const chunk of res.body as any) {
              const decoded = decoder.decode(chunk)
              console.log('Processing chunk:', decoded)
              parser.feed(decoded)
            }
          } catch (error) {
            console.error('Stream processing error:', error)
            controller.error(error)
          }
        },
  
        cancel() {
          // Clean up if needed
          console.log('Stream cancelled')
        }
      })
  
      return stream
    } catch (error) {
      console.error('GROQ Stream error:', error)
      throw error
    }
  }