@echo off
copy /Y "supabase.ts" "src\lib\supabase.ts"
git add src/lib/supabase.ts
git commit -m "fix: OpenRouter always tries next model on any error, logs status code"
git push origin main
pause
