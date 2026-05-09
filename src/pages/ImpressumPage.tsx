import { Link } from "react-router";
import { ArrowLeft, Building2, FileText, Mail, MapPin, Scale, ShieldAlert } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ImpressumPage() {
  return (
    <div className="min-h-screen bg-[#071018] text-slate-100">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_14%_0%,rgba(34,211,238,0.16),transparent_32%),radial-gradient(circle_at_88%_12%,rgba(245,158,11,0.12),transparent_30%)]" />
      <main className="relative mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:py-12">
        <Button asChild variant="ghost" className="mb-6 border border-white/10 text-slate-200 hover:bg-white/10">
          <Link to="/">
            <ArrowLeft className="h-4 w-4" />
            Zurück zu OCNE
          </Link>
        </Button>

        <section className="rounded-3xl border border-cyan-300/15 bg-white/[0.04] p-6 shadow-2xl shadow-black/30 backdrop-blur md:p-8">
          <div className="flex flex-wrap items-center gap-3">
            <Badge className="border-cyan-300/20 bg-cyan-300/10 text-cyan-100">Impressum</Badge>
            <Badge variant="outline" className="border-white/10 text-slate-300">
              Angaben nach § 5 DDG
            </Badge>
          </div>
          <h1 className="mt-5 text-4xl font-bold tracking-tight text-white md:text-5xl">
            Impressum
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-300 md:text-base">
            OCNE ist ein studentisches Softwareprojekt und wird nicht von einer GmbH, UG oder
            anderen Gesellschaft betrieben. Die Anschrift muss vor dem öffentlichen Betrieb durch
            die echte c/o-Adresse eines Impressum-Adressdienstes ersetzt werden.
          </p>
        </section>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_0.9fr]">
          <Card className="border-white/10 bg-[#0d1720]/90">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Building2 className="h-5 w-5 text-cyan-200" />
                Diensteanbieter
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm leading-6 text-slate-300">
              <div className="rounded-xl border border-amber-200/15 bg-amber-200/8 p-4 text-amber-50/90">
                <p className="font-semibold text-amber-50">Studentisches Softwareprojekt</p>
                <p className="mt-2">Busher Smakie</p>
                <p>OCNE - Online Code Network Editor</p>
                <p>c/o [Impressum address service]</p>
                <p>[Street and house number]</p>
                <p>[ZIP City]</p>
                <p>Germany</p>
              </div>
              <p>
                OCNE wird derzeit als studentisches Projekt einer Privatperson betrieben. Es gibt
                keine Gesellschaft, keinen Geschäftsführer, keinen Registereintrag und keine
                Umsatzsteuer-ID, solange diese Angaben nicht tatsächlich existieren.
              </p>
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-[#0d1720]/90">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Mail className="h-5 w-5 text-amber-200" />
                Kontakt
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm leading-6 text-slate-300">
              <div className="grid gap-3">
                <div className="rounded-xl border border-white/10 bg-white/[0.035] p-4">
                  <div className="mb-1 flex items-center gap-2 font-semibold text-white">
                    <Mail className="h-4 w-4 text-cyan-200" />
                    E-Mail
                  </div>
                  <a className="text-cyan-200 hover:text-cyan-100" href="mailto:OCNE@outlook.com">
                    OCNE@outlook.com
                  </a>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/[0.035] p-4">
                  <div className="mb-1 flex items-center gap-2 font-semibold text-white">
                    <MapPin className="h-4 w-4 text-cyan-200" />
                    Anschrift
                  </div>
                  <p>Siehe Diensteanbieter. Die c/o-Adresse muss durch den echten Impressum-Adressdienst ersetzt werden.</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-[#0d1720]/90 lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Scale className="h-5 w-5 text-emerald-200" />
                Weitere Pflichtangaben, falls zutreffend
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm leading-6 text-slate-300 md:grid-cols-2">
              <div className="rounded-xl border border-white/10 bg-white/[0.035] p-4">
                <h2 className="font-semibold text-white">Umsatzsteuer-ID</h2>
                <p className="mt-2">Nicht vorhanden, solange OCNE als studentisches Privatprojekt betrieben wird.</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.035] p-4">
                <h2 className="font-semibold text-white">Registerangaben</h2>
                <p className="mt-2">Nicht vorhanden, solange keine Gesellschaft oder eingetragene Organisation besteht.</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.035] p-4">
                <h2 className="font-semibold text-white">Berufsrechtliche Angaben</h2>
                <p className="mt-2">Nicht zutreffend für ein studentisches Softwareprojekt.</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.035] p-4">
                <h2 className="font-semibold text-white">Verbraucherschlichtung</h2>
                <p className="mt-2">
                  Falls Verbraucherangebote bestehen, sollte geprüft werden, ob Angaben zur
                  Streitbeilegung erforderlich sind.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-amber-200/15 bg-amber-200/8 lg:col-span-2">
            <CardContent className="flex gap-3 p-5 text-sm leading-6 text-amber-50/90">
              <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-200" />
              <div>
                <p className="font-semibold text-amber-50">Wichtiger Produktionshinweis</p>
                <p className="mt-1">
                  Diese Seite enthält noch eine c/o-Adressplatzhalterung. Vor dem öffentlichen
                  Betrieb muss hier die echte ladungsfähige Anschrift des gewählten
                  Impressum-Adressdienstes eingesetzt werden.
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-wrap gap-3 lg:col-span-2">
            <Button asChild className="bg-cyan-300 text-slate-950 hover:bg-cyan-200">
              <Link to="/datenschutz">Datenschutz ansehen</Link>
            </Button>
            <Button asChild variant="ghost" className="border border-white/10 text-slate-200 hover:bg-white/10">
              <Link to="/login">Zur Anmeldung</Link>
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
