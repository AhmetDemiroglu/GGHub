# Production Access Questionnaire — GGHub (Android)

Google Play "closed testing → production access" formu için hazır cevaplar.
Form İngilizce olduğu için cevaplar İngilizce yazıldı — her sorunun altındaki metni
doğrudan kopyalayıp yapıştırabilirsin.

**Bu cevaplar yalnızca gerçekte uygulanan değişiklikleri yansıtır:**
- ✅ Şifre göster/gizle (göz ikonu) — tüm şifre alanları (login, kayıt, sıfırlama, değiştirme)
- ✅ Logout ve diğer kritik aksiyonlar için düzgün onay dialog'ları; native alert kaldırıldı — mobil + web
- ❌ ASO (mağaza açıklaması/anahtar kelime) — **yapılmadı**; ayrı bir marketing işi
- ❌ Onboarding walkthrough — **yapılmadı**; ileri bir sürüme ertelendi

> Not: Orijinal taslaktaki "onboarding eklendi" (S3, S8, S10) ve "ASO yapıldı" (S8) iddiaları
> çıkarıldı. ASO ve onboarding yalnızca S4'te "alınan geri bildirim / planlı" olarak dürüstçe geçiyor.

**App:** GGHub — https://play.google.com/store/apps/details?id=com.gghub.mobile

---

## 1) How did you recruit users for your closed test? For example, did you ask friends and family, or use a paid testing provider?

We recruited testers through a paid testing provider and by reaching out directly to gamers in our target audience, in order to get real-world feedback on the core flows.

## 2) How easy was it to recruit testers for your app?

Easy.

## 3) Describe the engagement you received from testers during your closed test.

Testers engaged actively and submitted structured written feedback on usability and UI. Their most actionable input concerned account-safety UX — the lack of a password show/hide control and the absence of any confirmation before destructive actions such as logging out. We implemented both, which made the core flows clearer and safer.

## 4) Provide a summary of the feedback that you received from testers. Include how you collected the feedback.

Feedback was collected through the testing provider's written report and through feedback forms. Testers raised four points: (1) add a password visibility toggle, (2) add a confirmation before logout, (3) expand the store listing for ASO, and (4) add a first-launch onboarding walkthrough. We prioritized and shipped the two in-app usability and safety items (1 and 2). The store-listing work (3) is a separate marketing task, and the onboarding walkthrough (4) is planned for a later release, since the current flows tested as self-explanatory.

## 5) Who is the intended audience for your app?

GGHub targets gamers of all levels who want to discover games, build personalized lists, and connect with the community through ratings, reviews, and real-time chat.

## 6) Describe how your app provides value to the users.

GGHub lets users discover games, create personalized lists, follow and message other players, and share reviews. Real-time messaging and customizable profiles foster community engagement, making it a valuable platform for gamers.

## 7) How many installs do you expect your app to have in your first year?

10k – 100k.

## 8) What changes did you make to your app based on what you learned during your closed test?

Based on tester feedback we made two usability and safety improvements: (1) we added a show/hide (eye) toggle to every password field across login, registration, password reset, and change-password; and (2) we added clear in-app confirmation dialogs before logout and other destructive actions (delete list, delete comment, delete account, and admin actions), replacing inconsistent native system alerts with a single, consistent dialog across both mobile and web. These changes reduce accidental sign-outs and data loss and make the experience more polished.

## 9) How did you decide that your app is ready for production?

After the closed-testing cycle reported no crashes or functional defects, and after the prioritized usability and safety feedback was implemented and verified (type checks and the production web build pass; core flows — authentication, lists, profiles, and messaging — work as intended), we determined that the app is stable and ready for production.

## 10) What did you do differently this time?

This time we acted on structured tester feedback specifically targeting usability and account safety — adding password visibility and consistent confirmation dialogs — rather than only fixing defects. We also standardized how the app asks for confirmation (removing native alerts in favor of a consistent dialog), giving a more trustworthy and consistent feel across mobile and web.
