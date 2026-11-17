# Build, Vercel ופתרון תקלות

## Build מקומי

```bash
npm run build
npm run preview
```

`npm run build` יוצר את הטבעת מחדש ומפיק אתר סטטי ב־`dist/`.

## הגדרות Vercel

- Framework Preset: Vite
- Build Command: `npm run build`
- Output Directory: `dist`
- Install Command: `npm install`
- Node.js: גרסה מודרנית התואמת ל־Vite 8

`vite.config.js` משתמש ב־`base: './'`, ולכן הנתיבים נשארים יחסיים גם בפריסה סטטית.

## נכס ה־GLB

המודל מיובא עם `?url`. Vite נותן לו שם מבוסס hash והדפדפן טוען אותו כקובץ בינארי. כך Vercel יכול להגיש אותו דרך CDN ולשמור cache בלי לנפח את JavaScript ב־Base64.

## בדיקות לאחר פריסה

1. בדקו שאין שגיאות Console.
2. ודאו שבקשת `ring-*.glb` מחזירה 200 ו־Content-Type בינארי.
3. בדקו דסקטופ ומובייל אמיתי.
4. בדקו גלילה מהירה קדימה ואחורה.
5. בדקו Reduced Motion.

## פתרון תקלות

### הטבעת אינה מופיעה

- ודאו של־Canvas יש גודל שאינו אפס.
- בדקו את בקשת ה־GLB.
- חפשו שגיאת shader או WebGL context.
- ודאו ששמות ה־nodes במודל לא השתנו.

### הזהב נראה לבן

זו בדרך כלל שריפת highlights, לא בעיית רזולוציה. בדקו Exposure, Environment intensity, צבע מתכת ו־roughness לפני הגדלת DPR.

### המודל מטושטש

בדקו drawing buffer, DPR, Quality Tier ו־software rendering. אין להגדיל Canvas באמצעות transform של CSS.

### Context Loss

האתר מציג הודעת התאוששות. אם ההקשר אינו חוזר, בדקו צריכת זיכרון ו־render targets. אין ליצור renderer חדש בלולאה.
