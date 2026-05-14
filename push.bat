@echo off
copy /Y "tasks.ts"            "src\lib\tasks.ts"
copy /Y "supabase.ts"         "src\lib\supabase.ts"
copy /Y "App.tsx"             "src\App.tsx"
copy /Y "ScheduleBuilder.tsx" "src\components\ScheduleBuilder.tsx"
copy /Y "PrayerSchedule.tsx"  "src\components\PrayerSchedule.tsx"
copy /Y "vercel.json"         "vercel.json"
git add src/lib/tasks.ts src/lib/supabase.ts src/App.tsx src/components/ScheduleBuilder.tsx src/components/PrayerSchedule.tsx vercel.json
git commit -m "fix: scroll vs tap on mobile grid, sunnah prayer breakdown"
git push origin main
pause
