import { Link } from "react-router";
import { ArrowLeft, Cookie, Database, FileText, LockKeyhole, Mail, ShieldCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const dataGroups = [
  {
    title: "Account und Anmeldung",
    text: "Name, Benutzername, E-Mail-Adresse, Rolle, Login-Status, Sitzungsdaten und technische Sicherheitsdaten.",
  },
  {
    title: "Workspace und Projekte",
    text: "Projekte, Dateien, Editor-Zustand, Entwürfe, Snapshots, Dokumentation, Bug-Reports und Nutzungsaktionen innerhalb des Workspaces.",
  },
  {
    title: "Kommunikation",
    text: "Chat-Nachrichten, Direktnachrichten, Raum-Mitgliedschaften, Reaktionen, Lesestatus, Benachrichtigungen und technische Signale für Anrufe.",
  },
  {
    title: "Lokale Einstellungen",
    text: "Theme, Sidebar-Breite, Profilbild-/Klingelton-Auswahl, Call-Berechtigungen, PWA-/Cache-Status und lokale Agent-Verbindungsdaten, wenn du sie speicherst.",
  },
  {
    title: "Programme und Downloads",
    text: "Windows-Programm, Desktop-App-ZIP-Dateien, macOS-ZIP-Dateien und Desktop-Agent können lokale App-, Cache- und Einstellungsdaten speichern und online mit OCNE-Diensten verbinden.",
  },
];

const rights = [
  "Auskunft über gespeicherte personenbezogene Daten",
  "Berichtigung falscher oder unvollständiger Daten",
  "Löschung, soweit keine Aufbewahrungspflichten entgegenstehen",
  "Einschränkung der Verarbeitung",
  "Datenübertragbarkeit",
  "Widerspruch gegen bestimmte Verarbeitungen",
  "Widerruf einer Einwilligung mit Wirkung für die Zukunft",
  "Beschwerde bei einer zuständigen Datenschutzaufsichtsbehörde",
];

export default function DatenschutzPage() {
  return (
    <div className="min-h-screen bg-[#071018] text-slate-100">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_12%_0%,rgba(34,211,238,0.16),transparent_32%),radial-gradient(circle_at_90%_10%,rgba(245,158,11,0.12),transparent_28%)]" />
      <main className="relative mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:py-12">
        <Button asChild variant="ghost" className="mb-6 border border-white/10 text-slate-200 hover:bg-white/10">
          <Link to="/">
            <ArrowLeft className="h-4 w-4" />
            Zurück zu OCNE
          </Link>
        </Button>

        <section className="rounded-3xl border border-cyan-300/15 bg-white/[0.04] p-6 shadow-2xl shadow-black/30 backdrop-blur md:p-8">
          <div className="flex flex-wrap items-center gap-3">
            <Badge className="border-cyan-300/20 bg-cyan-300/10 text-cyan-100">Datenschutz</Badge>
            <Badge variant="outline" className="border-white/10 text-slate-300">
              Stand: 07.05.2026
            </Badge>
          </div>
          <h1 className="mt-5 max-w-4xl text-4xl font-bold tracking-tight text-white md:text-5xl">
            Datenschutzinformation für OCNE
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-300 md:text-base">
            Diese Seite erklärt, welche Informationen OCNE speichert, warum sie gespeichert werden
            und was mit diesen Informationen passiert. OCNE ist ein studentisches Softwareprojekt
            und wird derzeit nicht von einer Gesellschaft betrieben.
          </p>
        </section>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
          <div className="space-y-6">
            <Card className="border-white/10 bg-[#0d1720]/90">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <FileText className="h-5 w-5 text-cyan-200" />
                  Verantwortlicher
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm leading-6 text-slate-300">
                <p>
                  Verantwortlich für die Verarbeitung personenbezogener Daten im Rahmen von OCNE ist:
                </p>
                <div className="rounded-xl border border-amber-200/15 bg-amber-200/8 p-3 text-amber-50/90">
                  <p className="font-semibold text-amber-50">Busher Smakie</p>
                  <p>Studentisches Softwareprojekt OCNE</p>
                  <p>E-Mail: OCNE@outlook.com</p>
                </div>
                <p>
                  Diese Datenschutzinformation nennt nur Name und E-Mail-Adresse. Je nach öffentlichem
                  Betrieb und anwendbarem Recht können zusätzliche Kontaktangaben erforderlich sein.
                </p>
              </CardContent>
            </Card>

            <Card className="border-white/10 bg-[#0d1720]/90">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <Database className="h-5 w-5 text-amber-200" />
                  Welche Daten speichern wir?
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 md:grid-cols-2">
                  {dataGroups.map((group) => (
                    <div key={group.title} className="rounded-xl border border-white/10 bg-white/[0.035] p-4">
                      <h2 className="text-sm font-semibold text-white">{group.title}</h2>
                      <p className="mt-2 text-sm leading-6 text-slate-300">{group.text}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="border-white/10 bg-[#0d1720]/90">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <ShieldCheck className="h-5 w-5 text-emerald-200" />
                  Wofür nutzen wir die Informationen?
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm leading-6 text-slate-300">
                <p>
                  Wir verwenden Daten, um Konten bereitzustellen, Nutzer anzumelden, Projekte und
                  Dateien zu speichern, Editor-Sitzungen wiederherzustellen, Chat und Anrufe technisch
                  zu ermöglichen, Benachrichtigungen zu senden, Sicherheit zu gewährleisten und die
                  App-Performance durch Cache- und Installationsfunktionen zu verbessern.
                </p>
                <p>
                  Inhalte aus privaten Projekten, Nachrichten und lokalen Einstellungen werden nicht
                  verkauft und nicht für Werbung verwendet. Eine Nutzung für externe KI-Trainingsdaten
                  sollte nur stattfinden, wenn dies ausdrücklich in den Produkteinstellungen vorgesehen
                  und transparent erklärt ist.
                </p>
              </CardContent>
            </Card>

            <Card className="border-white/10 bg-[#0d1720]/90">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <LockKeyhole className="h-5 w-5 text-cyan-200" />
                  Server-Logs, Sicherheit und technische Daten
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm leading-6 text-slate-300">
                <p>
                  Beim Aufruf der Website können technisch notwendige Logdaten verarbeitet werden:
                  IP-Adresse, Zeitpunkt, aufgerufene URL, Browser-/Geräteinformationen, Referrer,
                  Statuscodes und übertragene Datenmenge. Diese Daten werden genutzt, um die Website
                  bereitzustellen, Angriffe zu erkennen, Fehler zu analysieren und den Betrieb
                  nachzuweisen.
                </p>
                <p>
                  Zugriffe auf Projekte, Chat, Dateien und lokale Agent-Verbindungen werden nur soweit
                  verarbeitet, wie es für Authentifizierung, Sicherheit, Funktionsbereitstellung und
                  Missbrauchsschutz erforderlich ist.
                </p>
              </CardContent>
            </Card>

            <Card className="border-white/10 bg-[#0d1720]/90">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <Cookie className="h-5 w-5 text-cyan-200" />
                  Cookies und lokale Speicherung
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm leading-6 text-slate-300">
                <p>
                  OCNE nutzt notwendige Cookies und Browser-Speicher, um die Website sicher und
                  nutzbar zu machen. Dazu gehören Session-/Login-Cookies, die Cookie-Auswahl,
                  Sidebar- und Theme-Einstellungen, Editor-Entwürfe, Profiloptionen, Anrufpräferenzen
                  und lokale Agent-Daten, wenn du sie selbst einträgst.
                </p>
                <p>
                  Technisch notwendige Speicherungen dienen der Bereitstellung der Website. Optionale
                  Funktionen sollten nur nach Auswahl oder Einwilligung aktiviert werden.
                </p>
              </CardContent>
            </Card>

            <Card className="border-white/10 bg-[#0d1720]/90">
              <CardHeader>
                <CardTitle className="text-white">Empfänger, Auftragsverarbeitung und Übermittlungen</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm leading-6 text-slate-300">
                <p>
                  OCNE nutzt technische Dienstleister, damit Website, API, Datenbank, Quellcode und
                  Downloads funktionieren. Dazu gehören derzeit insbesondere Render für Hosting/API,
                  Aiven für die MySQL-Datenbank und GitHub für Quellcode, Deployment-Anbindung und
                  öffentliche Projektdateien.
                </p>
                <p>
                  Diese Anbieter können technische Daten wie IP-Adresse, Anfragezeitpunkt,
                  Header-Daten, Logdaten, Deployments, Downloads oder Datenbankverbindungen
                  verarbeiten, soweit dies für Betrieb, Sicherheit, Fehleranalyse und Bereitstellung
                  von OCNE erforderlich ist.
                </p>
                <p>
                  Eine Übermittlung in Länder außerhalb der EU/des EWR kann abhängig vom jeweiligen
                  Anbieter und dessen Infrastruktur stattfinden. Für den öffentlichen Betrieb sollten
                  die aktuellen Datenschutzinformationen und Auftragsverarbeitungsverträge der
                  Anbieter geprüft und hinterlegt werden.
                </p>
              </CardContent>
            </Card>

            <Card className="border-white/10 bg-[#0d1720]/90">
              <CardHeader>
                <CardTitle className="text-white">Programme, Apps und lokale Nutzung</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm leading-6 text-slate-300">
                <p>
                  Die OCNE Website läuft im Browser und verbindet sich mit der OCNE-API auf Render.
                  Die API verarbeitet die Daten in der Aiven-MySQL-Datenbank.
                </p>
                <p>
                  Das installierbare OCNE Windows-Programm bringt die Oberfläche als Programmdateien
                  mit und läuft auf deinem Computer. Für Anmeldung, Projekte, Chat, Profil,
                  Downloads und andere Online-Funktionen verbindet es sich mit derselben OCNE-API und
                  derselben Aiven-Datenbank wie die Website.
                </p>
                <p>
                  Die Desktop-App-ZIP-Dateien für Windows und macOS dienen als alternative App-Pakete.
                  Sie können die Website oder lokale Programmdateien öffnen und für Online-Funktionen
                  ebenfalls die OCNE-API nutzen.
                </p>
                <p>
                  Der OCNE Desktop Agent ist ein lokales Hilfsprogramm für Funktionen wie lokale
                  Terminal-/Datei- oder Geräteverbindungen. Er verarbeitet Daten auf deinem Computer
                  und verbindet sich nur mit OCNE-Funktionen, wenn du ihn installierst, startest und
                  entsprechende lokale Verbindungen erlaubst.
                </p>
                <p>
                  Auf deinem Computer können notwendige lokale Daten gespeichert werden, zum Beispiel
                  Cache-Dateien, Login-Status, Fenster-/App-Einstellungen, lokale Agent-Einstellungen
                  und lokale Browser-Speicherwerte der Desktop-App. Diese lokalen Daten dienen der
                  Funktion der Programme und können über App-/Browserdaten, Agent-Einstellungen oder
                  durch Deinstallation gelöscht werden.
                </p>
              </CardContent>
            </Card>

            <Card className="border-white/10 bg-[#0d1720]/90">
              <CardHeader>
                <CardTitle className="text-white">Kontosicherheit, Missbrauch und Entfernung</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm leading-6 text-slate-300">
                <p>
                  OCNE darf Konten, Inhalte, Projekte, Nachrichten oder Zugänge einschränken, sperren
                  oder löschen, wenn Nutzer OCNE für rechtswidrige Inhalte, Angriffe, Spam,
                  Belästigung, Malware, Missbrauch der Infrastruktur, Verletzungen von Rechten
                  Dritter oder andere schwere Regelverstöße verwenden.
                </p>
                <p>
                  Betroffene Nutzer können über OCNE@outlook.com Kontakt aufnehmen, wenn sie Fragen
                  zu einer Sperrung, Löschung oder Prüfung ihres Kontos haben.
                </p>
              </CardContent>
            </Card>

            <Card className="border-white/10 bg-[#0d1720]/90">
              <CardHeader>
                <CardTitle className="text-white">Tracking, Werbung und Analyse</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm leading-6 text-slate-300">
                <p>
                  In der aktuellen OCNE-Oberfläche werden keine Werbe-Cookies, keine Third-Party-
                  Marketingprofile und kein Verkauf personenbezogener Daten beschrieben. Werden später
                  Analytics-, Werbe- oder externe Tracking-Dienste eingebaut, müssen sie vor dem Start
                  klar benannt und, soweit erforderlich, erst nach Einwilligung aktiviert werden.
                </p>
              </CardContent>
            </Card>
          </div>

          <aside className="space-y-6">
            <Card className="border-cyan-300/15 bg-cyan-300/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <LockKeyhole className="h-5 w-5 text-cyan-100" />
                  Rechtsgrundlagen
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm leading-6 text-cyan-50/80">
                <p>
                  Je nach Funktion erfolgt die Verarbeitung zur Vertragserfüllung, aufgrund berechtigter
                  Interessen an Sicherheit und Betrieb, zur Erfüllung gesetzlicher Pflichten oder auf
                  Grundlage deiner Einwilligung.
                </p>
                <p>
                  Speicherdauer: Daten werden nur so lange gespeichert, wie sie für Konto, Workspace,
                  Sicherheit, Nachweise oder gesetzliche Pflichten benötigt werden.
                </p>
                <p>
                  Löschung: Lokale Browserdaten können Nutzer in ihrem Browser löschen. Kontodaten,
                  Projekte und Kommunikationsdaten sollten über Support oder Kontofunktionen gelöscht
                  werden können, soweit keine rechtlichen Aufbewahrungspflichten bestehen.
                </p>
              </CardContent>
            </Card>

            <Card className="border-white/10 bg-[#0d1720]/90">
              <CardHeader>
                <CardTitle className="text-white">Deine Rechte</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm leading-6 text-slate-300">
                  {rights.map((right) => (
                    <li key={right} className="flex gap-2">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-300" />
                      <span>{right}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card className="border-white/10 bg-[#0d1720]/90">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <Mail className="h-5 w-5 text-amber-200" />
                  Kontakt
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm leading-6 text-slate-300">
                <p>
                  Für Datenschutzfragen, Auskunft oder Löschung nutze bitte die offizielle
                  Datenschutz-Kontaktadresse des Betreibers.
                </p>
                <Button asChild className="w-full bg-cyan-300 text-slate-950 hover:bg-cyan-200">
                  <a href="mailto:OCNE@outlook.com">OCNE@outlook.com</a>
                </Button>
              </CardContent>
            </Card>
          </aside>
        </div>
      </main>
    </div>
  );
}
