import { chatbotPrompt } from '@/helpers/constants/chatbot-prompt'
import { GroqMessage, GroqStream, GroqStreamPayload } from '@/lib/groq-stream'
import { MessageArraySchema } from '@/lib/validators/message'

export async function POST(req: Request) {
  try {
    const { messages } = await req.json()
    console.log('Received messages:', messages)

    const parsedMessages = MessageArraySchema.parse(messages)
    console.log('Parsed messages:', parsedMessages)

    const outboundMessages: GroqMessage[] = parsedMessages.map((message) => ({
      role: message.isUserMessage ? 'user' : 'assistant',
      content: message.text,
    }))

    outboundMessages.unshift({
      role: 'system',
      content: chatbotPrompt,
    })

    console.log('Outbound messages:', outboundMessages)

    const payload: GroqStreamPayload = {
      model: 'mixtral-8x7b-32768',
      messages: outboundMessages,
      temperature: 0.4,
      top_p: 1,
      max_tokens: 150,
      stream: true,
    }

    const stream = await GroqStream(payload)
    
    if (!stream) {
      throw new Error('No stream returned from GROQ')
    }

    // Create readable stream
    const readable = new ReadableStream({
      async start(controller) {
        try {
          const reader = stream.getReader()
          
          let done = false
          while (!done) {
            const result = await reader.read()
            done = result.done
            if (done) {
              console.log('Stream complete')
              controller.close()
              break
            }
            
            console.log('Chunk received:', new TextDecoder().decode(result.value))
            controller.enqueue(result.value)
          }
        } catch (error) {
          console.error('Stream error:', error)
          controller.error(error)
        }
      },
    })

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })

  } catch (error) {
    console.error('Message API Error:', error)
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), { 
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    })
  }
}