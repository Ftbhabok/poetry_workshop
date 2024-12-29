import { z } from 'zod'

export const MessageSchema = z.object({
  id: z.string(),
  text: z.string(),
  isUserMessage: z.boolean(),
})

// array validator
// this gives the context of msg previously used 
export const MessageArraySchema = z.array(MessageSchema)

export type Message = z.infer<typeof MessageSchema>
