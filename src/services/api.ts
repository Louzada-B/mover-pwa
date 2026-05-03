import { supabase } from './supabase'
import type { Post, Event, Training, TrainingInterest, CheckIn, RideOffer, RideRequest, User } from '../types'

// ─── AUTH ────────────────────────────────────────────────────
export const authService = {
  signIn: (email: string, password: string) =>
    supabase.auth.signInWithPassword({ email, password }),

  signOut: () => supabase.auth.signOut(),

  getSession: () => supabase.auth.getSession(),

  updatePassword: (password: string) =>
    supabase.auth.updateUser({ password }),

  async getCurrentUser(): Promise<User | null> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    return data as User | null
  },

  onAuthStateChange: (cb: Parameters<typeof supabase.auth.onAuthStateChange>[0]) =>
    supabase.auth.onAuthStateChange(cb),
}

// ─── POSTS ───────────────────────────────────────────────────
export const postsService = {
  async getAll(): Promise<Post[]> {
    const { data, error } = await supabase
      .from('posts')
      .select('*, author:profiles(id, full_name)')
      .order('pinned', { ascending: false })
      .order('created_at', { ascending: false })
    if (error) throw error
    return data as Post[]
  },
  async create(post: Partial<Post>) {
    const { data, error } = await supabase.from('posts').insert(post).select().single()
    if (error) throw error
    return data as Post
  },
  async delete(id: string) {
    const { error } = await supabase.from('posts').delete().eq('id', id)
    if (error) throw error
  },
}

// ─── EVENTS ──────────────────────────────────────────────────
export const eventsService = {
  async getAll(): Promise<Event[]> {
    const { data, error } = await supabase
      .from('events').select('*').order('date', { ascending: true })
    if (error) throw error
    return data as Event[]
  },
  async create(event: Partial<Event>) {
    const { data, error } = await supabase.from('events').insert(event).select().single()
    if (error) throw error
    return data as Event
  },
  async delete(id: string) {
    const { error } = await supabase.from('events').delete().eq('id', id)
    if (error) throw error
  },
}

// ─── TRAININGS ───────────────────────────────────────────────
export const trainingsService = {
  async getNext(): Promise<Training | null> {
    const today = new Date().toISOString().split('T')[0]
    const { data } = await supabase
      .from('trainings').select('*').gte('date', today)
      .order('date', { ascending: true }).limit(1).single()
    return data as Training | null
  },
  async getAll(): Promise<Training[]> {
    const { data, error } = await supabase
      .from('trainings').select('*').order('date', { ascending: true })
    if (error) throw error
    return data as Training[]
  },
  async create(t: Partial<Training>) {
    const { data, error } = await supabase.from('trainings').insert(t).select().single()
    if (error) throw error
    return data as Training
  },
  async delete(id: string) {
    const { error } = await supabase.from('trainings').delete().eq('id', id)
    if (error) throw error
  },
  async updateCheckinConfig(trainingId: string, config: {
    checkin_lat: number
    checkin_lng: number
    checkin_radius: number
    checkin_start: string
    checkin_end: string
  }) {
    const { error } = await supabase
      .from('trainings').update(config).eq('id', trainingId)
    if (error) throw error
  },
  async getInterested(trainingId: string): Promise<TrainingInterest[]> {
    const { data, error } = await supabase
      .from('training_interests')
      .select('*, user:profiles(id, full_name)')
      .eq('training_id', trainingId)
    if (error) throw error
    return data as TrainingInterest[]
  },
  async toggleInterest(trainingId: string, userId: string): Promise<boolean> {
    const { data: existing } = await supabase
      .from('training_interests').select('id')
      .eq('training_id', trainingId).eq('user_id', userId).single()
    if (existing) {
      await supabase.from('training_interests').delete().eq('id', existing.id)
      return false
    }
    await supabase.from('training_interests').insert({ training_id: trainingId, user_id: userId })
    return true
  },
  async getCheckIns(trainingId: string): Promise<CheckIn[]> {
    const { data, error } = await supabase
      .from('check_ins').select('*, user:profiles(id, full_name)').eq('training_id', trainingId)
    if (error) throw error
    return data as CheckIn[]
  },
  async checkIn(trainingId: string, userId: string): Promise<{ alreadyCheckedIn: boolean }> {
    const { data: existing } = await supabase
      .from('check_ins').select('id')
      .eq('training_id', trainingId).eq('user_id', userId).single()
    if (existing) return { alreadyCheckedIn: true }
    await supabase.from('check_ins').insert({ training_id: trainingId, user_id: userId })
    return { alreadyCheckedIn: false }
  },
}

// ─── RIDES ───────────────────────────────────────────────────
export const ridesService = {
  async getForTraining(trainingId: string): Promise<RideOffer[]> {
    const { data, error } = await supabase
      .from('ride_offers')
      .select('*, user:profiles(id, full_name), requests:ride_requests(*, user:profiles(id, full_name))')
      .eq('training_id', trainingId).order('created_at', { ascending: false })
    if (error) throw error
    return data as RideOffer[]
  },
  async createOffer(offer: Partial<RideOffer>) {
    const { data, error } = await supabase.from('ride_offers').insert(offer).select().single()
    if (error) throw error
    return data as RideOffer
  },
  async deleteOffer(id: string) {
    const { error } = await supabase.from('ride_offers').delete().eq('id', id)
    if (error) throw error
  },
  async requestRide(offerId: string, userId: string) {
    const { data, error } = await supabase
      .from('ride_requests')
      .insert({ ride_offer_id: offerId, user_id: userId, status: 'pending' })
      .select().single()
    if (error) throw error
    return data as RideRequest
  },
  async updateRequest(requestId: string, status: 'accepted' | 'rejected') {
    const { error } = await supabase.from('ride_requests').update({ status }).eq('id', requestId)
    if (error) throw error
  },
  async cancelRequest(requestId: string) {
    const { error } = await supabase.from('ride_requests').delete().eq('id', requestId)
    if (error) throw error
  },
}

// ─── MEMBERS ─────────────────────────────────────────────────
export const membersService = {
  async getAll(): Promise<User[]> {
    const { data, error } = await supabase
      .from('profiles').select('*').order('full_name', { ascending: true })
    if (error) throw error
    return data as User[]
  },
  async invite(email: string, fullName: string, phone?: string) {
    const { data, error } = await supabase.functions.invoke('invite-member', {
      body: { email, full_name: fullName, phone },
    })
    if (error) throw error
    return data
  },
  async setActive(id: string, isActive: boolean) {
    const { error } = await supabase.from('profiles').update({ is_active: isActive }).eq('id', id)
    if (error) throw error
  },
}
