# Maimon Diamonds

אתר תדמית אינטראקטיבי למותג תכשיטי יוקרה, המבוסס על טבעת ויהלומים בתלת־ממד, אנימציות גלילה קולנועיות ועיצוב רספונסיבי בעברית.

האתר משלב HTML סמנטי ו־CSS עם React Three Fiber עבור שכבת התלת־ממד, GSAP עבור הכוריאוגרפיה ו־Lenis עבור גלילה חלקה. שכבת התוכן נשארת זמינה גם כאשר WebGL אינו נתמך.

## התחלה מהירה

דרישות: Node.js מודרני ו־npm.

```bash
npm install
npm run dev
```

Build ו־Production Preview:

```bash
npm run build
npm run preview
```

הפקודה `npm run build` מייצרת תחילה מחדש את מודל הטבעת ולאחר מכן מריצה את Vite. תוצר הפריסה נמצא בתיקיית `dist/`.

## טכנולוגיות

- Vite 8
- React 19
- Three.js 0.170
- React Three Fiber ו־Drei
- GSAP, ScrollTrigger, SplitText ו־CustomEase
- Lenis
- glTF Transform ו־Meshoptimizer עבור יצירת המודל

Three.js נשאר בגרסה `0.170` משום שחומר היהלום של Drei תלוי בממשק shader התואם לגרסה זו. אין לשדרג אותו בנפרד מ־Drei ו־React Three Fiber ללא בדיקה חזותית מלאה.

## מבנה הפרויקט

```text
index.html                 תוכן האתר והמבנה הסמנטי
src/main.js                סדר האתחול וחיבור DOM לתלת־ממד
src/state.js               מצב אנימציה משותף והגדרות המתכות
src/styles.css             כל שכבת העיצוב והרספונסיביות
src/dom/                   גלילה, פתיח, תוויות ואינטראקציות DOM
src/three/                 Canvas, טבעת, חומרים, תאורה וסטודיו
scripts/build-ring.mjs     מחולל הטבעת המקורית
models/ring.glb            מודל GLB שנוצר בזמן Build
docs/                      תיעוד מפורט
```

## מסמכי המשך

- [ארכיטקטורה וזרימת אתחול](docs/ARCHITECTURE.md)
- [מערכת התלת־ממד](docs/THREEJS.md)
- [GSAP, גלילה ואינטראקציות](docs/ANIMATION.md)
- [התאמה למובייל, ביצועים ונגישות](docs/PERFORMANCE.md)
- [שינוי תוכן, צבעים והגדרות](docs/CUSTOMIZATION.md)
- [Build ופריסה ב־Vercel](docs/DEPLOYMENT.md)
- [תחזוקה ובדיקות](docs/MAINTENANCE.md)

## כללי עבודה חשובים

- תוכן ופעולות עסקיות נשארים ב־HTML; React משמש רק לשכבת התלת־ממד.
- ערכים ש־GSAP כותב ו־R3F קורא נמצאים ב־`src/state.js`.
- אין להחליף את ה־GLB ידנית בלי לעדכן גם את metadata או את מחולל המודל.
- יש לבדוק כל שינוי בדסקטופ, במובייל ובמצב Reduced Motion.
- Vercel צריך להריץ את ה־Build ולהגיש את `dist/`.

## בעלות על המודל

הטבעת נוצרת פרוצדורלית בקוד שב־`scripts/build-ring.mjs` ואינה מבוססת על נכס תלת־ממד חיצוני. פרטי המותג, התמונות והטקסטים העסקיים עדיין באחריות בעל האתר.
