הוראות העלאה ל-Netlify (כדי שה-AI יעבוד בלי שאף משתמש יזין API Key):
1. חלץ את קובץ ה-ZIP לתיקייה במחשב (או העלה דרך Git / Netlify CLI).
   * שימו לב: גרירת תיקייה ב-Netlify Drop לא מעלה Netlify Functions — מומלץ לחבר לריפוזיטורי ב-GitHub או להריץ `netlify deploy --prod`.
2. בלוח הבקרה של האתר ב-Netlify היכנס ל:
   Site configuration -> Environment variables -> Add a variable
3. הוסף משתנה בשם: GEMINI_API_KEY
   והדבק בתור הערך את המפתח מ-Google AI Studio.
4. בצע Deploy מחדש (Trigger deploy), ומאותו רגע גם אתה וגם חברים שתשתף איתם יוכלו לנתח תמונות וארוחות ב-AI בלי להזין מפתח!
5. סריקת הברקוד וחיפוש המוצרים (Open Food Facts) עובדים מיד בכל מקום ללא שום מפתח.
