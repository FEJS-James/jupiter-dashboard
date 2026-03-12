// Common types used throughout the application

export interface User {
  id: string
  name: string
  email: string
  createdAt: Date
  updatedAt: Date
}

export interface BaseEntity {
  id: string
  createdAt: Date
  updatedAt: Date
}