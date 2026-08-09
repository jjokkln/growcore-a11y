# AGENTS.md — growcore-a11y

Anweisungen für KI-Agenten (Cursor, Codex, Copilot, Claude Code) und für
Menschen, die in diesem Repository arbeiten. Der Block unten ist zentral
gepflegt und wird überschrieben — Projektspezifisches gehört darunter.

<!-- BEGIN:growcore-pflicht 99ed75bf3ebf — generiert aus AI-OS/30_Knowledge/Rules/pflichtkern.md, nicht von Hand ändern -->
## Pflichtkern GrowCore — nicht verhandelbar

Diese zehn Punkte gelten in **jedem** Projekt, für **jeden** Agenten und jeden
Menschen, der hier Code schreibt. Sie sind keine Empfehlungen. Wer einen davon
nicht erfüllen kann, schreibt das auf, statt ihn stillschweigend zu übergehen.

Gilt für alles, was ein Kunde oder Besucher zu sehen bekommt — Marketing-Website,
Kundenportal, Admin-Dashboard, Konfigurator. Mit **(App)** markierte Punkte
gelten nur, wenn es Logins gibt.

**1. Alles läuft in der EU.** Supabase-Projekte immer in Frankfurt (`eu-central-1`),
Hosting Vercel, KI-Dienste mit Personenbezug nur in EU-Regionen (Muster:
`gemini-2.5-flash` @ `europe-west1`). Ein Projekt in London oder Virginia wird
umgezogen, nicht dokumentiert.
*Beweis:* Region im Supabase-Dashboard bzw. `get_project_url`, nicht die Erinnerung.

**2. Impressum und Datenschutzerklärung sind vorhanden und wahr.** Impressum nach
§ 5 DDG von jeder Seite in einem Klick erreichbar, Datenschutzerklärung nach
Art. 13 DSGVO, die **jeden real eingesetzten Dienst** nennt: Hosting, Datenbank,
Mailversand, Analytics, Karten, Schriften, KI. Keine Standardvorlage mit Diensten,
die nicht laufen, und ohne die, die laufen.
*Beweis:* die genannten Dienste gegen die echten Netzwerk-Requests halten.

**3. Vor der Einwilligung geht kein Request an einen Dritten.** Analytics, Karten,
YouTube, Social-Embeds, externe Schriften, Pixel — alles erst nach aktiver
Zustimmung (§ 25 TDDDG). „Ablehnen" hat dieselbe Größe, Schriftstärke und
Farbigkeit wie „Akzeptieren". Impressum und Datenschutz dürfen von keinem Dialog
verdeckt werden. Ein Widerruf muss erreichbar sein.
*Beweis:* Netzwerk-Mitschnitt im Browser, Zähler für Drittanbieter-Requests **auf 0**.
Nicht „der Code sieht richtig aus".

**4. Drei-Schritt-Regel: ein neuer Drittanbieter ändert drei Dinge im selben
Arbeitsschritt.** (1) die technische Stelle, (2) den Consent-/Banner-Text,
(3) die Datenschutzerklärung. Und er bekommt ein Einwilligungs-Gate, nicht nur
einen Absatz. Rechtstexte kennen weder Build noch Tests — hier wird nichts rot,
wenn man es vergisst. Genau das ist am 2026-07-30 passiert: Instagram, TikTok und
Facebook waren eingebettet, während die Erklärung „werden **nicht** eingebettet"
behauptete.

**5. Nichts wird erfunden.** Keine Testimonials ohne echten Absender, keine
unbelegten Mitgliedschaften oder Zertifikate, keine Zahl und kein Preis, den der
Kunde nicht freigegeben hat, keine Platzhalter-Adressen, keine Blindtexte.
**Eine Zahl im Kundentext ist eine Zusage.** Sie kommt vom Kunden oder sie kommt
nicht auf die Seite. Fehlt ein Inhalt, wird die Sektion entfernt, nicht gefüllt.

**6. Wo KI im Produkt läuft, steht es dran.** Risikoklasse (EU AI Act) und Rolle
(Anbieter oder Betreiber) **schriftlich vor der ersten Zeile Code**. Ein Chatbot
muss als KI erkennbar sein, **bevor** jemand tippt — das Wort „KI" muss fallen,
„Virtual Assistant" reicht nicht. Publizierte KI-Inhalte zu Themen von
allgemeinem Interesse bekommen die offiziellen EU-Zeichen, nie selbstgebaute
Hinweis-Pillen. Jede redaktionelle Tabelle bekommt ihr Offenlegungsfeld
(`ai_disclosure`) **beim Anlegen**, so wie RLS gleich mitkommt.
Gilt **nicht** dafür, dass mit Claude entwickelt wurde — nur für KI, die beim
Nutzer läuft.

**7. Die Seite ist ohne Maus bedienbar.** Volle Tastaturbedienung mit sichtbarem
Fokus, Kontrast 4,5:1, Alt-Texte, verknüpfte Formularbeschriftungen, genau eine
`<h1>` pro Seite, 175 % Schriftgröße ohne waagerechtes Scrollen. Dazu das
Barrierefreiheits-Panel (`@growcore/a11y`) und eine Seite `/barrierefreiheit` mit
erreichbarem Kontakt. Das Panel ist ein Komfort-Plus — es ersetzt die Arbeit am
Markup nicht.
*Beweis:* `npx @axe-core/cli <url> --exit` **plus** Handprüfung. Ein automatischer
Checker findet höchstens ein Drittel.

**8. Formulare fragen nur das Nötige und kommen an.** Datenschutzhinweis nach
Art. 13 direkt am Formular, nur Felder, die wirklich gebraucht werden. Und die
Strecke wurde **einmal echt ausgelöst**: abgeschickt → in der Datenbank →
Mail beim Kunden → Bestätigung beim Absender. Eine Website ohne funktionierende
Anfrage ist keine Lead-Maschine, sondern eine Broschüre.

**9. (App) Jede Tabelle hat RLS, und die Middleware wurde gemessen.** Der
anon-Key ist öffentlich — jede Tabelle bekommt explizite Minimal-Policies,
Migration und RLS im selben Commit. Server Actions und Routes prüfen zusätzlich
selbst `auth.getUser()`; die Middleware allein reicht nicht. Bei Next.js heißt
sie `proxy.ts` (Funktion `proxy()`) — eine `middleware.ts` wird **stillschweigend
ignoriert**, ohne Fehler und ohne Warnung. So lag bei einem Projekt `/admin`
live offen im Netz.
*Beweis:* `curl -s -o /dev/null -w "%{http_code}" <geschützter-pfad>` plus die
Zeile `ƒ Proxy (Middleware)` im Build-Output. Getestet wird mit **jeder** Rolle,
einschließlich eines Zugangs ohne Berechtigung. Als Admin sieht immer alles
richtig aus. Ein leerer Zustand und eine fehlschlagende Policy sehen von außen
gleich aus — Zeilen **zählen**, nicht hinsehen.

**10. Kundendaten stehen an genau einer Stelle.** Firmenname, Anschrift, Telefon,
Mail, Registerangaben, Domain in einer Datei (`site-config.ts`), aus der sich
Kopfbereich, Fußbereich, Impressum, Datenschutz, Metadaten und strukturierte
Daten bedienen. Ändert sich eine Telefonnummer, ändert man sie einmal statt an
neun Stellen — und vergisst die zehnte nicht.

---

**Vor Go-Live, in dieser Reihenfolge:** `/rechtscheck` (darf die Seite überhaupt
online — Punkte 1–7) → `/launch-check` (funktioniert und hält sie — Punkte 8–10)
→ die Blueprint-Checkliste des Projekttyps. Beide Skills prüfen nur und melden
„nicht verifiziert", wo sie nichts beweisen können; das ist die Bedingung dafür,
dass man ihrem grünen Haken glauben darf.

**Wenn du keine dieser Prüfungen ausführen kannst** (weil du nicht Claude Code
bist oder kein Zugriff auf das AI-OS hast): die Punkte gelten trotzdem. Schreib
in deine Antwort, welche du nicht verifizieren konntest, statt sie zu übergehen.
<!-- END:growcore-pflicht -->

## Projektspezifisch

_Noch nichts eingetragen. Hier gehört hin, was man von außen nicht sehen
kann: Eigenheiten des Stacks, bekannte Stolperfallen, lokale Abweichungen
vom Standard und warum. Ausführlich in `context/`._
