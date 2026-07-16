# Кітап Клубы

Кітап оқудың дағдысын қалыптастыру үшін веб-қолданба.

## Орнату нұсқаулығы

### 1. Node.js орнату

https://nodejs.org — LTS нұсқасын жүктеп, орнатыңыз.

### 2. Supabase жобасын жасау

1. https://supabase.com → жаңа жоба жасаңыз
2. Project Settings → API → `URL` мен `anon key` мәндерін сақтаңыз
3. SQL Editor-ге кіріп, `supabase/schema.sql` файлының мазмұнын орындаңыз

### 3. Телефон аутентификациясын қосу

Supabase Dashboard → Authentication → Providers → Phone:
- Enable phone provider
- Twilio немесе Vonage SMS провайдерін қосыңыз (телефон OTP үшін)
- Development/test үшін: "Enable phone confirmations" өшіріп қойсаңыз, Supabase логтарынан OTP кодты көре аласыз

### 4. Env файлын жасау

`.env.local.example` файлын `.env.local` деп атын өзгертіп, мәліметтерді толтырыңыз:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 5. Қолданбаны іске қосу

```bash
npm install
npm run dev
```

http://localhost:3000 — браузерде ашыңыз.

### 6. Adminге рөл беру

Тіркелгеннен кейін Supabase Dashboard → Table Editor → profiles → өз жазбаңызды тауып, role = `admin` деп өзгертіңіз.

---

## Рөлдер

| Рөл | Мүмкіндіктер |
|-----|-------------|
| **admin** | Барлық пайдаланушылар мен клубтарды басқару |
| **facilitator** | Клуб жасау, жоспар қосу, анализ жазу, оқырман прогресін көру |
| **reader** | Клубқа тіркелу (макс. 3), трекер жасау |

## Технологиялар

- **Next.js 14** (App Router)
- **Supabase** (PostgreSQL + Auth + Realtime)
- **Tailwind CSS**
- **TypeScript**
