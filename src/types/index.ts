export type UserRole = 'admin' | 'member'

export interface User {
  id: string
  email: string
  full_name: string
  phone?: string
  role: UserRole
  avatar_url?: string
  created_at: string
  is_active: boolean
}

export interface Post {
  id: string
  title: string
  content: string
  image_url?: string
  author_id: string
  author?: Pick<User, 'id' | 'full_name'>
  created_at: string
  pinned: boolean
}

export interface Event {
  id: string
  title: string
  description?: string
  date: string
  time?: string
  location?: string
  type: 'treino' | 'corrida' | 'social' | 'outro'
  created_by: string
  created_at: string
}

export interface Training {
  id: string
  date: string
  title: string
  location?: string
  open_at: string
  close_at: string
  created_at: string
  checkin_lat?: number
  checkin_lng?: number
  checkin_radius?: number
  checkin_start?: string
  checkin_end?: string
}

export interface TrainingInterest {
  id: string
  training_id: string
  user_id: string
  user?: Pick<User, 'id' | 'full_name'>
  created_at: string
}

export interface CheckIn {
  id: string
  training_id: string
  user_id: string
  user?: Pick<User, 'id' | 'full_name'>
  checked_in_at: string
}

export interface RideOffer {
  id: string
  user_id: string
  user?: Pick<User, 'id' | 'full_name'>
  training_id: string
  origin: string
  departure_time: string
  available_seats: number
  notes?: string
  created_at: string
  requests?: RideRequest[]
}

export interface RideRequest {
  id: string
  ride_offer_id: string
  user_id: string
  user?: Pick<User, 'id' | 'full_name'>
  status: 'pending' | 'accepted' | 'rejected'
  created_at: string
}
