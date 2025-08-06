-- Add email column to user_profiles table
ALTER TABLE public.user_profiles 
ADD COLUMN email text;

-- Update the handle_new_user function to store email
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.user_profiles (id, full_name, email)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', NEW.email);
  RETURN NEW;
END;
$$;

-- Backfill existing user emails from auth.users
-- This is a one-time operation to populate emails for existing users
DO $$
DECLARE
    user_record RECORD;
BEGIN
    -- Get all users from auth.users and update their profiles
    FOR user_record IN 
        SELECT au.id, au.email 
        FROM auth.users au
        WHERE au.email IS NOT NULL
    LOOP
        UPDATE public.user_profiles 
        SET email = user_record.email
        WHERE id = user_record.id AND email IS NULL;
    END LOOP;
END $$;