-- Tworzenie głównej tabeli z figurkami
CREATE TABLE public.figures (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    japanese_name TEXT,
    series TEXT,
    japanese_series TEXT,
    manufacturer TEXT,
    scale TEXT,
    type TEXT,
    status TEXT,
    original_price TEXT,
    official_image_url TEXT, -- to pole przechowuje bazową nazwę dla plików WebP/AVIF (np. 'miku_figure' lub pełny URL jeśli korzystamy ze storage)
    light_class TEXT,
    additional_info JSONB, -- tablica stringów
    market_value JSONB, -- obiekt zawierający average i community
    where_to_search JSONB, -- tablica stringów
    strategy JSONB, -- tablica stringów
    submitted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- powiązanie Autora (kto dodał)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Włączenie Row Level Security
ALTER TABLE public.figures ENABLE ROW LEVEL SECURITY;

-- Polityki dostępu (RLS)
-- Każdy może przeglądać figurki
CREATE POLICY "Public figures are viewable by everyone." 
ON public.figures FOR SELECT USING (true);

-- Tylko zalogowani użytkownicy mogą dodawać figurki
CREATE POLICY "Zalogowani użytkownicy mogą dodawać figurki." 
ON public.figures FOR INSERT 
WITH CHECK (auth.uid() = submitted_by OR auth.uid() IS NOT NULL);

-- Tylko administrator (lub autor) może edytować/usuwać
-- Tutaj tworzymy prostą tabelę profili z rólką
CREATE TABLE public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    is_admin BOOLEAN DEFAULT FALSE,
    username TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public profiles are viewable by everyone." ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile." ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Dodajemy trigger, który automatycznie utworzy profil po rejestracji (dla wygody)
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, username, is_admin)
  VALUES (new.id, split_part(new.email, '@', 1), false);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Polityki aktualizacji figurek (admin może modyfikować wszystkie)
CREATE POLICY "Admini mogą aktualizować wszystkie figurki." 
ON public.figures FOR UPDATE 
USING ( (SELECT is_admin FROM public.profiles WHERE id = auth.uid()) = true );

CREATE POLICY "Admini mogą usuwać figurki." 
ON public.figures FOR DELETE 
USING ( (SELECT is_admin FROM public.profiles WHERE id = auth.uid()) = true );


-- Opcjonalnie: Tabela dla Kolekcji (Gablotek Użytkowników)
CREATE TABLE public.user_collections (
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    figure_id UUID REFERENCES public.figures(id) ON DELETE CASCADE,
    added_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    PRIMARY KEY (user_id, figure_id)
);

ALTER TABLE public.user_collections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Użytkownicy widzą swoje i innych kolekcje." ON public.user_collections FOR SELECT USING (true);
CREATE POLICY "Użytkownicy mogą dodawać do swojej kolekcji." ON public.user_collections FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Użytkownicy mogą usuwać ze swojej kolekcji." ON public.user_collections FOR DELETE USING (auth.uid() = user_id);
