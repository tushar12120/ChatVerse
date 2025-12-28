import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://gtrxevdtfrnxvkiqcwla.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd0cnhldmR0ZnJueHZraXFjd2xhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY5MDA0MzMsImV4cCI6MjA4MjQ3NjQzM30.DcfZRbLjvGEwjwY0eUSRHSxDLrJMPh6P04MQaYVM_8M'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
