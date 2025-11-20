TBK - FOREIGN CALL (Production-ready template)
============================================

Included files:
- index.html : Main Khmer UI
- styles.css : Styling (Battambang font)
- firebase-init.js : Paste your Firebase config (REPLACE values)
- app.js : Main application logic (Firestore + Storage + PDF export)
- assets/form_template.jpeg : The scanned form you uploaded (path used: /mnt/data/photo_2025-11-17 09.48.51.jpeg)
- assets/logo.png : placeholder logo

Important notes:
- The app uses Firebase compat SDKs (included in index.html). Edit firebase-init.js with your project's config.
- Login is hardcoded (foreign@tbk.com / TBK123*@) for admin actions.
- Submissions are stored in Firestore collection: 'foreign_calls' and images in Storage under 'uploads/'.
- The combined PDF export will render each record onto the scanned form template (assets/form_template.jpeg).
- CORS: For images hosted in Storage to be embedded into the PDF, ensure your storage bucket allows read access or set proper CORS rules.
- To run locally: host the folder (GitHub Pages, Netlify, or simple local static server).

How I used your uploaded scanned form:
- The file at this path was copied into the project assets and will be used as the PDF background:
  /mnt/data/photo_2025-11-17 09.48.51.jpeg

If you want me to tweak the exact text coordinates used in the PDF (to perfectly align fields), tell me which field(s) are misaligned and I will adjust the x/y mm coordinates in app.js.
