-- Update the profiles table to include more metadata
ALTER TABLE public.profiles
ADD COLUMN first_name text,
ADD COLUMN last_name text,
ADD COLUMN username text UNIQUE;

-- Update the function to handle new users with metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, first_name, last_name, username)
  VALUES (
    new.id,
    new.raw_user_meta_data->>'first_name',
    new.raw_user_meta_data->>'last_name',
    new.raw_user_meta_data->>'username'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
