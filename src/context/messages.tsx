'use client'

import { createContext, useState } from 'react'
import { Message } from '@/lib/validators/message'

interface MessagesContextType {
  messages: Message[]
  isMessageUpdating: boolean
  addMessage: (message: Message) => void
  removeMessage: (id: string) => void
  updateMessage: (id: string, updateFn: (prevText: string) => string) => void
  setIsMessageUpdating: (isUpdating: boolean) => void
}

export const MessagesContext = createContext<MessagesContextType>({
  messages: [],
  isMessageUpdating: false,
  addMessage: () => {},
  removeMessage: () => {},
  updateMessage: () => {},
  setIsMessageUpdating: () => {},
})

export function MessagesProvider({ children }: { children: React.ReactNode }) {
  const [messages, setMessages] = useState<Message[]>([])
  const [isMessageUpdating, setIsMessageUpdating] = useState<boolean>(false)

  const addMessage = (message: Message) => {
    setMessages((prevMessages) => [...prevMessages, message])
  }

  const removeMessage = (id: string) => {
    setMessages((prevMessages) => prevMessages.filter((message) => message.id !== id))
  }

  const updateMessage = (id: string, updateFn: (prevText: string) => string) => {
    setMessages((prevMessages) => 
      prevMessages.map((message) => {
        if (message.id === id) {
          return { ...message, text: updateFn(message.text) }
        }
        return message
      })
    )
  }

  return (
    <MessagesContext.Provider
      value={{
        messages,
        isMessageUpdating,
        addMessage,
        removeMessage,
        updateMessage,
        setIsMessageUpdating,
      }}
    >
      {children}
    </MessagesContext.Provider>
  )
}